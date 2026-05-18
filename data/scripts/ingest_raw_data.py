from __future__ import annotations

import argparse
import json
from collections import Counter
from typing import Any
from urllib.parse import urlparse

from data_layer_common import (
    METADATA_DIR,
    RAW_DIR,
    REPORTS_DIR,
    choose_display_title,
    classify_data_role,
    classify_file_type,
    ensure_data_dirs,
    extract_html_text,
    extract_pdf_text,
    infer_category,
    load_source_manifest,
    looks_like_mojibake,
    read_csv_rows,
    read_json_rows,
    read_text_file,
    read_xlsx_rows,
    rel_path,
    sha256_file,
    stable_document_id,
    utc_now,
    write_csv,
    write_json,
    write_xlsx,
)


CATALOG_FIELDS = [
    "document_id",
    "title",
    "file_name",
    "file_type",
    "extension",
    "category",
    "data_role",
    "is_content_document",
    "is_manifest_file",
    "is_system_file",
    "is_archive_file",
    "is_processable",
    "relative_path",
    "local_path",
    "source_url",
    "source_domain",
    "language",
    "file_size_bytes",
    "checksum_sha256",
    "is_public",
    "access_note",
    "ingested_at",
    "ingestion_status",
    "issues",
    "page_count",
    "text_sample_length",
]


def build_catalog(limit: int | None = None) -> list[dict[str, Any]]:
    ensure_data_dirs()
    source_manifest = load_source_manifest()
    files = [path for path in RAW_DIR.rglob("*") if path.is_file()]
    files.sort(key=lambda item: item.relative_to(RAW_DIR).as_posix())
    if limit:
        files = files[:limit]

    existing_report = _load_existing_ingestion_report()
    report_by_path = {row["relative_path"]: row for row in existing_report.get("files", [])}
    duplicate_paths = {
        path
        for group in existing_report.get("duplicate_groups", [])
        for path in group.get("files", [])
    }

    rows: list[dict[str, Any]] = []
    for path in files:
        relative_path = rel_path(path)
        file_type = classify_file_type(path)
        data_role = classify_data_role(relative_path, file_type)
        checksum = report_by_path.get(relative_path, {}).get("checksum_sha256") or sha256_file(path)
        manifest_row = source_manifest.get(relative_path, {})
        source_url = str(manifest_row.get("source_url") or "")
        source_domain = str(manifest_row.get("source_domain") or _domain_from_url(source_url))
        issues = list(report_by_path.get(relative_path, {}).get("issues") or [])
        size = path.stat().st_size
        page_count = 0
        text_sample_length = 0
        title = str(manifest_row.get("title") or manifest_row.get("description") or path.stem)
        language = str(manifest_row.get("language") or "vi")
        category = str(manifest_row.get("category") or infer_category(relative_path))

        if size == 0 and "empty_file" not in issues:
            issues.append("empty_file")
        if relative_path in duplicate_paths and "duplicate_checksum" not in issues:
            issues.append("duplicate_checksum")

        try:
            if file_type == "html":
                result = extract_html_text(path)
                title = result.get("title") or title
                text_sample_length = len(result.get("text", ""))
            elif file_type == "txt":
                sample, _encoding, text_issues = read_text_file(path, max_chars=20_000)
                issues.extend(text_issues)
                text_sample_length = len(sample)
            elif file_type == "pdf":
                result = extract_pdf_text(path, max_pages=1, max_chars=5_000)
                page_count = int(result.get("page_count", 0) or 0)
                text_sample_length = int(result.get("text_length", 0) or 0)
                if result.get("metadata", {}).get("Title"):
                    title = result["metadata"]["Title"]
                if result.get("needs_ocr") and "pdf_sample_needs_ocr" not in issues:
                    issues.append("pdf_sample_needs_ocr")
            elif file_type == "json":
                records, parse_issues = read_json_rows(path)
                issues.extend(parse_issues)
                if looks_like_mojibake(json.dumps(records[:20], ensure_ascii=False)):
                    issues.append("possible_mojibake")
                text_sample_length = len(json.dumps(records[:5], ensure_ascii=False))
            elif file_type == "csv":
                records, parse_issues = read_csv_rows(path, max_rows=20)
                issues.extend(parse_issues)
                if looks_like_mojibake(json.dumps(records[:20], ensure_ascii=False)):
                    issues.append("possible_mojibake")
                text_sample_length = len(json.dumps(records[:5], ensure_ascii=False))
            elif file_type == "xlsx":
                records, parse_issues = read_xlsx_rows(path, max_rows=20)
                issues.extend(parse_issues)
                if looks_like_mojibake(json.dumps(records[:20], ensure_ascii=False)):
                    issues.append("possible_mojibake")
                text_sample_length = len(json.dumps(records[:5], ensure_ascii=False))
            elif file_type in {"archive", "md", "other"}:
                issues.append(f"{file_type}_not_processed_by_default")
        except Exception as exc:
            issues.append(f"ingestion_probe_error:{type(exc).__name__}")

        title = choose_display_title(title, path.name)
        rows.append(
            {
                "document_id": stable_document_id(relative_path, checksum),
                "title": title,
                "file_name": path.name,
                "file_type": file_type,
                "extension": path.suffix.lower(),
                "category": category,
                "data_role": data_role,
                "is_content_document": data_role == "content",
                "is_manifest_file": data_role == "manifest",
                "is_system_file": data_role == "system",
                "is_archive_file": data_role == "archive",
                "is_processable": data_role in {"content", "table", "manifest"},
                "relative_path": relative_path,
                "local_path": str(path),
                "source_url": source_url,
                "source_domain": source_domain,
                "language": language,
                "file_size_bytes": size,
                "checksum_sha256": checksum,
                "is_public": bool(manifest_row.get("is_public", True)),
                "access_note": str(manifest_row.get("access_note") or "public/local educational dataset"),
                "ingested_at": utc_now(),
                "ingestion_status": _status_from_issues(issues),
                "issues": sorted(set(issues)),
                "page_count": page_count,
                "text_sample_length": text_sample_length,
            }
        )
    return rows


def _load_existing_ingestion_report() -> dict[str, Any]:
    path = REPORTS_DIR / "ingestion_report.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _domain_from_url(url: str) -> str:
    if not url:
        return ""
    return urlparse(url).netloc.lower()


def _status_from_issues(issues: list[str]) -> str:
    error_prefixes = ("empty_file", "json_parse_error", "csv_parse_error", "xlsx_parse_error", "probe_error", "ingestion_probe_error")
    if any(issue.startswith(error_prefixes) for issue in issues):
        return "error"
    if issues:
        return "warning"
    return "ok"


def main() -> None:
    parser = argparse.ArgumentParser(description="Create metadata catalog from data/raw.")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    rows = build_catalog(limit=args.limit)
    write_json(METADATA_DIR / "data_catalog.json", rows)
    write_csv(METADATA_DIR / "data_catalog.csv", rows, CATALOG_FIELDS)
    write_xlsx(METADATA_DIR / "data_catalog.xlsx", rows, CATALOG_FIELDS)
    print(
        json.dumps(
            {
                "catalog_records": len(rows),
                "status_counts": dict(Counter(row["ingestion_status"] for row in rows)),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
