from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any

from data_layer_common import (
    DATA_DIR,
    FEATURES_DIR,
    METADATA_DIR,
    PROCESSED_DIR,
    RAW_DIR,
    REPORTS_DIR,
    ensure_data_dirs,
    keywords_from_text,
    read_jsonl,
    summarize_text_lengths,
    utc_now,
    write_json,
    write_jsonl,
)


def build_features(limit: int | None = None, chunk_size: int = 1000, overlap: int = 120) -> dict[str, Any]:
    ensure_data_dirs()
    processed_path = PROCESSED_DIR / "documents" / "processed_documents.jsonl"
    processed_rows = read_jsonl(processed_path)
    if limit:
        processed_rows = processed_rows[:limit]

    chunks: list[dict[str, Any]] = []
    search_docs: list[dict[str, Any]] = []
    text_lengths: list[int] = []

    for row in processed_rows:
        text_path_value = row.get("processed_text_path")
        text = ""
        if text_path_value:
            text_path = DATA_DIR / Path(text_path_value)
            if text_path.exists():
                text = text_path.read_text(encoding="utf-8")
        if not text:
            continue

        text_lengths.append(len(text))
        doc_chunks = _chunk_text(text, chunk_size=chunk_size, overlap=overlap)
        for index, chunk_text in enumerate(doc_chunks):
            chunks.append(
                {
                    "chunk_id": _chunk_id(row["document_id"], index, chunk_text),
                    "document_id": row["document_id"],
                    "chunk_index": index,
                    "text": chunk_text,
                    "title": row.get("title", ""),
                    "source_url": row.get("source_url", ""),
                    "category": row.get("category", "khac"),
                    "file_type": row.get("file_type", ""),
                    "data_role": row.get("data_role", "other"),
                    "is_content_document": bool(row.get("is_content_document")),
                    "char_count": len(chunk_text),
                    "word_count": len(chunk_text.split()),
                }
            )
        search_docs.append(
            {
                "document_id": row["document_id"],
                "title": row.get("title", ""),
                "text_preview": text[:500],
                "keywords": keywords_from_text(text),
                "path": row.get("relative_path", ""),
                "source_url": row.get("source_url", ""),
                "category": row.get("category", "khac"),
                "file_type": row.get("file_type", ""),
                "data_role": row.get("data_role", "other"),
                "is_content_document": bool(row.get("is_content_document")),
            }
        )

    write_jsonl(FEATURES_DIR / "chunks" / "document_chunks.jsonl", chunks)
    write_json(FEATURES_DIR / "search_index" / "simple_search_index.json", search_docs)

    catalog = _read_json(METADATA_DIR / "data_catalog.json", [])
    processing_report = _read_json(REPORTS_DIR / "processing_report.json", {})
    ingestion_report = _read_json(REPORTS_DIR / "ingestion_report.json", {})
    statistics = _build_statistics(catalog, processed_rows, chunks, text_lengths, processing_report, ingestion_report)
    write_json(FEATURES_DIR / "statistics" / "data_statistics.json", statistics)
    write_json(
        REPORTS_DIR / "feature_report.json",
        {
            "created_at": utc_now(),
            "total_chunks": len(chunks),
            "search_documents": len(search_docs),
            "statistics_path": "data/features/statistics/data_statistics.json",
        },
    )
    write_json(METADATA_DIR / "schema_registry.json", _schema_registry())
    write_json(METADATA_DIR / "dataset_version.json", _dataset_version(catalog, processed_rows, chunks, ingestion_report, statistics))
    write_json(METADATA_DIR / "data_lineage.json", _data_lineage(statistics))
    write_json(METADATA_DIR / "access_policy.json", _access_policy())
    write_json(METADATA_DIR / "data_dictionary.json", _data_dictionary())
    return statistics


def _chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    if not text:
        return []
    chunks: list[str] = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= length:
            break
        start = max(0, end - overlap)
    return chunks


def _chunk_id(document_id: str, chunk_index: int, text: str) -> str:
    digest = hashlib.sha256(f"{document_id}|{chunk_index}|{text[:80]}".encode("utf-8")).hexdigest()[:16]
    return f"chunk_{digest}"


def _read_json(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def _build_statistics(
    catalog: list[dict[str, Any]],
    processed_rows: list[dict[str, Any]],
    chunks: list[dict[str, Any]],
    text_lengths: list[int],
    processing_report: dict[str, Any],
    ingestion_report: dict[str, Any],
) -> dict[str, Any]:
    file_type_distribution = Counter(row.get("file_type", "other") for row in catalog)
    content_rows = [row for row in catalog if row.get("is_content_document")]
    manifest_rows = [row for row in catalog if row.get("is_manifest_file")]
    system_rows = [row for row in catalog if row.get("is_system_file")]
    archive_rows = [row for row in catalog if row.get("is_archive_file")]
    processable_rows = [row for row in catalog if row.get("is_processable")]
    content_processed_rows = [row for row in processed_rows if row.get("is_content_document") and row.get("processed_text_path")]
    content_chunks = [chunk for chunk in chunks if chunk.get("is_content_document")]
    content_file_type_distribution = Counter(row.get("file_type", "other") for row in content_rows)
    content_category_distribution = Counter(row.get("category", "khac") for row in content_rows)
    category_distribution = Counter(row.get("category", "khac") for row in catalog)
    source_domain_distribution = Counter(row.get("source_domain") or "local" for row in catalog)
    issue_counts = _merge_issue_counts(
        ingestion_report.get("issue_counts", {}),
        processing_report.get("issue_counts", {}),
    )
    issue_volume = sum(issue_counts.values())
    score_penalty = min(60.0, len(issue_counts) * 2 + issue_volume / max(1, len(catalog)) * 10)
    quality_score = round(max(40.0, 100 - score_penalty), 1)
    quality_breakdown = _quality_breakdown(
        catalog=catalog,
        content_rows=content_rows,
        content_processed_rows=content_processed_rows,
        issue_counts=issue_counts,
        processing_report=processing_report,
    )
    raw_integrity_score = _raw_integrity_score(catalog, issue_counts)
    governance_score = 94.0
    ai_readiness_score = _ai_readiness_score(
        content_docs=len(content_rows),
        content_processed=len(content_processed_rows),
        content_chunks=len(content_chunks),
        pdf_needs_ocr=int(processing_report.get("pdf_needs_ocr_count", 0) or 0),
    )
    overall_data_health = round(
        quality_breakdown["content_readiness_score"] * 0.32
        + ai_readiness_score * 0.28
        + governance_score * 0.2
        + raw_integrity_score * 0.2,
        1,
    )
    return {
        "created_at": utc_now(),
        "total_raw_files": len(catalog),
        "total_documents": len(processed_rows),
        "content_documents": len(content_rows),
        "manifest_files": len(manifest_rows),
        "system_files": len(system_rows),
        "archive_files": len(archive_rows),
        "processable_documents": len(processable_rows),
        "processed_text_documents": sum(1 for row in processed_rows if row.get("processed_text_path")),
        "content_processed_text_documents": len(content_processed_rows),
        "total_chunks": len(chunks),
        "content_chunks": len(content_chunks),
        "file_type_distribution": dict(file_type_distribution),
        "content_file_type_distribution": dict(content_file_type_distribution),
        "category_distribution": dict(category_distribution),
        "content_category_distribution": dict(content_category_distribution),
        "source_domain_distribution": dict(source_domain_distribution.most_common(20)),
        "text_length_distribution": summarize_text_lengths(text_lengths),
        "missing_summary": processing_report.get("missing_summary", {}),
        "outlier_summary": processing_report.get("outlier_summary", {}),
        "pdf_needs_ocr_count": processing_report.get("pdf_needs_ocr_count", 0),
        "issue_counts": dict(issue_counts),
        "quality_score": quality_score,
        "raw_quality_score": quality_breakdown["raw_quality_score"],
        "content_readiness_score": quality_breakdown["content_readiness_score"],
        "processing_readiness_score": quality_breakdown["processing_readiness_score"],
        "ai_readiness_score": ai_readiness_score,
        "governance_score": governance_score,
        "raw_integrity_score": raw_integrity_score,
        "overall_data_health": overall_data_health,
        "quality_breakdown": quality_breakdown,
        "status_counts": processing_report.get("status_counts", {}),
    }


def _merge_issue_counts(*sources: Any) -> Counter[str]:
    merged: Counter[str] = Counter()
    for source in sources:
        if not isinstance(source, dict):
            continue
        for issue, count in source.items():
            try:
                merged[str(issue)] = max(merged[str(issue)], int(count))
            except Exception:
                continue
    return merged


def _quality_breakdown(
    catalog: list[dict[str, Any]],
    content_rows: list[dict[str, Any]],
    content_processed_rows: list[dict[str, Any]],
    issue_counts: Counter[str],
    processing_report: dict[str, Any],
) -> dict[str, Any]:
    pdf_count = sum(1 for row in content_rows if row.get("file_type") == "pdf")
    pdf_needs_ocr = int(processing_report.get("pdf_needs_ocr_count", 0) or 0)
    missing_cells = int(processing_report.get("missing_summary", {}).get("total_missing_cells", 0) or 0)
    duplicate_groups = int(issue_counts.get("duplicate_checksum", 0))
    encoding_count = int(issue_counts.get("possible_mojibake", 0))
    short_body_count = int(issue_counts.get("html_short_body", 0))
    archive_system = sum(1 for row in catalog if row.get("is_archive_file") or row.get("is_system_file"))
    content_coverage = len(content_processed_rows) / max(1, len(content_rows))

    ocr_penalty = round(min(22.0, (pdf_needs_ocr / max(1, pdf_count)) * 22), 1)
    missing_values_penalty = round(min(8.0, missing_cells / 10), 1)
    encoding_penalty = round(min(8.0, encoding_count * 1.5), 1)
    short_body_penalty = round(min(6.0, short_body_count * 1.5), 1)
    archive_system_penalty = round(min(5.0, archive_system / max(1, len(catalog)) * 20), 1)
    duplicate_penalty = round(min(10.0, duplicate_groups * 2), 1)
    processing_coverage_penalty = round((1 - content_coverage) * 18, 1)

    raw_penalty = round(
        ocr_penalty
        + missing_values_penalty
        + encoding_penalty
        + short_body_penalty
        + archive_system_penalty
        + duplicate_penalty
        + processing_coverage_penalty,
        1,
    )
    content_penalty = round(ocr_penalty + encoding_penalty + short_body_penalty + processing_coverage_penalty, 1)
    processing_penalty = round(missing_values_penalty + encoding_penalty + processing_coverage_penalty, 1)
    return {
        "ocr_penalty": ocr_penalty,
        "missing_values_penalty": missing_values_penalty,
        "encoding_penalty": encoding_penalty,
        "short_body_penalty": short_body_penalty,
        "archive_system_file_penalty": archive_system_penalty,
        "duplicate_penalty": duplicate_penalty,
        "processing_coverage_penalty": processing_coverage_penalty,
        "raw_quality_score": round(max(40.0, 100 - raw_penalty), 1),
        "content_readiness_score": round(max(45.0, 100 - content_penalty), 1),
        "processing_readiness_score": round(max(45.0, 100 - processing_penalty), 1),
        "content_processing_coverage_percent": round(content_coverage * 100, 1),
        "recommended_fixes": [
            f"Run OCR for {pdf_needs_ocr} PDFs flagged with low text extraction.",
            "Exclude archive/system files from content KPIs and public demo samples.",
            f"Fix {encoding_count} possible mojibake/encoding issue records.",
            f"Review {short_body_count} short HTML pages.",
            f"Clean manifest/table nulls ({missing_cells} missing cells).",
        ],
    }


def _schema_registry() -> dict[str, Any]:
    return {
        "created_at": utc_now(),
        "schemas": {
            "data_catalog": {
                "primary_key": "document_id",
                "fields": {
                    "document_id": "string",
                    "title": "string",
                    "file_type": "pdf|html|txt|json|csv|xlsx|archive|md|other",
                    "category": "string",
                    "relative_path": "string",
                    "source_url": "string",
                    "source_domain": "string",
                    "file_size_bytes": "integer",
                    "checksum_sha256": "string",
                    "ingestion_status": "ok|warning|error",
                    "issues": "array<string>",
                },
            },
            "processed_documents": {
                "primary_key": "document_id",
                "fields": {
                    "processed_text_path": "string",
                    "text_length_chars": "integer",
                    "word_count": "integer",
                    "needs_ocr": "boolean",
                    "processing_status": "ok|warning|error|skipped",
                },
            },
            "document_chunks": {
                "primary_key": "chunk_id",
                "fields": {
                    "document_id": "string",
                    "chunk_index": "integer",
                    "text": "string",
                    "source_url": "string",
                    "category": "string",
                    "char_count": "integer",
                    "word_count": "integer",
                },
            },
            "data_statistics": {
                "fields": {
                    "total_raw_files": "integer",
                    "content_documents": "integer",
                    "manifest_files": "integer",
                    "system_files": "integer",
                    "archive_files": "integer",
                    "total_documents": "integer",
                    "total_chunks": "integer",
                    "content_readiness_score": "number",
                    "quality_score": "number",
                    "issue_counts": "object",
                },
            },
        },
    }


def _dataset_version(
    catalog: list[dict[str, Any]],
    processed_rows: list[dict[str, Any]],
    chunks: list[dict[str, Any]],
    ingestion_report: dict[str, Any],
    statistics: dict[str, Any],
) -> dict[str, Any]:
    checksum_summary = hashlib.sha256(
        "|".join(sorted(str(row.get("checksum_sha256", "")) for row in catalog)).encode("utf-8")
    ).hexdigest()
    return {
        "dataset_name": "Lumi Data Layer Local Dataset",
        "version": "local-1.0",
        "created_at": utc_now(),
        "raw_path": str(RAW_DIR),
        "processed_path": str(PROCESSED_DIR),
        "features_path": str(FEATURES_DIR),
        "total_raw_files": len(catalog),
        "content_documents": statistics.get("content_documents"),
        "manifest_files": statistics.get("manifest_files"),
        "system_files": statistics.get("system_files"),
        "archive_files": statistics.get("archive_files"),
        "total_documents": len(processed_rows),
        "total_chunks": len(chunks),
        "checksum_summary": checksum_summary,
        "pipeline_steps": [
            "inspect_raw_data.py",
            "ingest_raw_data.py",
            "process_documents.py",
            "build_features.py",
        ],
        "access_policy": "Local educational project dataset; raw files are not exposed directly to public clients.",
        "security_note": "Do not store secrets or API keys in data files. Dataset outputs contain metadata and extracted public text only.",
        "quality_score": statistics.get("quality_score"),
        "content_readiness_score": statistics.get("content_readiness_score"),
        "ai_readiness_score": statistics.get("ai_readiness_score"),
        "governance_score": statistics.get("governance_score"),
        "raw_integrity_score": statistics.get("raw_integrity_score"),
        "overall_data_health": statistics.get("overall_data_health"),
        "ingestion_issue_counts": ingestion_report.get("issue_counts", {}),
    }


def _raw_integrity_score(catalog: list[dict[str, Any]], issue_counts: Counter[str]) -> float:
    total = max(1, len(catalog))
    checksum_coverage = sum(1 for row in catalog if row.get("checksum_sha256")) / total
    penalties = (
        int(issue_counts.get("empty_file", 0)) * 12
        + int(issue_counts.get("duplicate_checksum", 0)) * 10
        + int(issue_counts.get("large_file", 0)) * 1.5
    )
    return round(max(60.0, min(100.0, checksum_coverage * 100 - penalties)), 1)


def _ai_readiness_score(content_docs: int, content_processed: int, content_chunks: int, pdf_needs_ocr: int) -> float:
    coverage = content_processed / max(1, content_docs)
    chunk_factor = min(1.0, content_chunks / max(1, content_docs * 3))
    ocr_penalty = min(22.0, pdf_needs_ocr / max(1, content_docs) * 40)
    return round(max(45.0, min(100.0, coverage * 58 + chunk_factor * 30 + 12 - ocr_penalty)), 1)


def _data_lineage(statistics: dict[str, Any]) -> dict[str, Any]:
    return {
        "generated_at": utc_now(),
        "dataset_name": "Lumi Data Layer Local Dataset",
        "stages": [
            {
                "name": "Raw Layer",
                "input_path": str(RAW_DIR),
                "output_path": str(RAW_DIR),
                "script": "external collection / manual raw dataset",
                "records": statistics.get("total_raw_files", 0),
                "status": "available",
            },
            {
                "name": "Data Ingestion",
                "input_path": str(RAW_DIR),
                "output_path": str(METADATA_DIR / "data_catalog.json"),
                "script": "data/scripts/ingest_raw_data.py",
                "records": statistics.get("total_raw_files", 0),
                "status": "generated",
            },
            {
                "name": "Processed Layer",
                "input_path": str(METADATA_DIR / "data_catalog.json"),
                "output_path": str(PROCESSED_DIR),
                "script": "data/scripts/process_documents.py",
                "records": statistics.get("processed_text_documents", 0),
                "status": "generated",
            },
            {
                "name": "Feature Layer",
                "input_path": str(PROCESSED_DIR),
                "output_path": str(FEATURES_DIR),
                "script": "data/scripts/build_features.py",
                "records": statistics.get("total_chunks", 0),
                "status": "generated",
            },
            {
                "name": "Governance",
                "input_path": str(METADATA_DIR),
                "output_path": str(METADATA_DIR),
                "script": "data/scripts/build_features.py",
                "records": 3,
                "status": "generated",
            },
        ],
    }


def _access_policy() -> dict[str, Any]:
    return {
        "generated_at": utc_now(),
        "dataset_access": "Public academic dataset for learning/research demos.",
        "source_policy": [
            "Use only public sources that do not require login.",
            "Do not store application secrets or API keys in data files.",
            "Keep raw storage local unless a reviewed storage policy is added.",
            "Do not commit .env, .env.local, API keys, or private credentials.",
        ],
        "local_paths": {
            "raw": str(RAW_DIR),
            "processed": str(PROCESSED_DIR),
            "features": str(FEATURES_DIR),
            "metadata": str(METADATA_DIR),
            "reports": str(REPORTS_DIR),
        },
        "planned_controls": ["DVC dataset versioning", "S3/HDFS object storage policy", "PostgreSQL row-level access", "audit logs"],
    }


def _data_dictionary() -> dict[str, Any]:
    return {
        "generated_at": utc_now(),
        "data_catalog": {
            "document_id": "Stable id from path and checksum.",
            "title": "Display title inferred from metadata, HTML title, or cleaned filename.",
            "file_type": "pdf/html/txt/json/csv/xlsx/md/archive/other.",
            "data_role": "content, manifest, system, archive, table, or other.",
            "category": "Domain category inferred from path or source manifest.",
            "relative_path": "Path inside data/raw.",
            "source_url": "Public source URL if present in manifest.",
            "ingestion_status": "ok, warning, or error.",
            "issues": "Detected raw/ingestion issues.",
        },
        "document_chunks": {
            "chunk_id": "Stable chunk id.",
            "document_id": "Parent document id.",
            "chunk_index": "Order inside document.",
            "text": "Chunk text used for keyword/search demo.",
            "is_content_document": "True for pdf/html/txt content docs.",
        },
        "data_statistics": {
            "content_documents": "PDF/HTML/TXT content docs, excluding manifests/system/archive.",
            "manifest_files": "JSON/CSV/XLSX manifest/support files.",
            "content_readiness_score": "Demo-friendly score focused on content processing readiness.",
            "quality_breakdown": "Penalty breakdown and recommended fixes.",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build lightweight features for AI and BI.")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--chunk-size", type=int, default=1000)
    parser.add_argument("--overlap", type=int, default=120)
    args = parser.parse_args()
    stats = build_features(limit=args.limit, chunk_size=args.chunk_size, overlap=args.overlap)
    print(
        json.dumps(
            {
                "total_documents": stats["total_documents"],
                "total_chunks": stats["total_chunks"],
                "quality_score": stats["quality_score"],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
