from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

from data_layer_common import (
    METADATA_DIR,
    PROCESSED_DIR,
    RAW_DIR,
    REPORTS_DIR,
    ensure_data_dirs,
    extract_html_text,
    extract_pdf_text,
    looks_like_mojibake,
    normalize_text,
    read_csv_rows,
    read_json_rows,
    read_text_file,
    read_xlsx_rows,
    table_profile,
    utc_now,
    write_csv,
    write_json,
    write_jsonl,
)


def process_documents(limit: int | None = None, skip_pdf_text: bool = False) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    ensure_data_dirs()
    catalog_path = METADATA_DIR / "data_catalog.json"
    if not catalog_path.exists():
        raise FileNotFoundError("Missing data/metadata/data_catalog.json. Run ingest_raw_data.py first.")
    catalog: list[dict[str, Any]] = json.loads(catalog_path.read_text(encoding="utf-8"))
    if limit:
        catalog = catalog[:limit]

    processed_rows: list[dict[str, Any]] = []
    table_profiles: list[dict[str, Any]] = []
    issues_counter: Counter[str] = Counter()

    for record in catalog:
        file_type = record["file_type"]
        source_path = RAW_DIR / record["relative_path"]
        output_text_path = PROCESSED_DIR / "text" / f"{record['document_id']}.txt"
        issues = list(record.get("issues") or [])
        text = ""
        page_count = int(record.get("page_count") or 0)
        needs_ocr = False
        processed_table_path = ""
        processing_status = "ok"

        try:
            if file_type == "pdf":
                if skip_pdf_text:
                    issues.append("pdf_text_extraction_skipped")
                    processing_status = "skipped"
                else:
                    result = extract_pdf_text(source_path, max_pages=40, max_chars=400_000)
                    text = result.get("text", "")
                    page_count = int(result.get("page_count", page_count) or 0)
                    needs_ocr = bool(result.get("needs_ocr"))
                    issues.extend(result.get("issues", []))
                    if needs_ocr:
                        issues.append("pdf_needs_ocr")
            elif file_type == "html":
                result = extract_html_text(source_path)
                text = result.get("text", "")
                if result.get("title"):
                    record["title"] = result["title"]
                issues.extend(result.get("issues", []))
            elif file_type == "txt":
                raw_text, _encoding, text_issues = read_text_file(source_path)
                issues.extend(text_issues)
                text = normalize_text(raw_text)
            elif file_type in {"json", "csv", "xlsx"}:
                rows, parse_issues = _read_table_rows(source_path, file_type)
                issues.extend(parse_issues)
                if looks_like_mojibake(json.dumps(rows[:20], ensure_ascii=False)):
                    issues.append("possible_mojibake")
                profile = table_profile(rows)
                table_profiles.append(
                    {
                        "document_id": record["document_id"],
                        "relative_path": record["relative_path"],
                        "file_type": file_type,
                        "profile": profile,
                    }
                )
                if rows:
                    table_path = PROCESSED_DIR / "tables" / f"{record['document_id']}.csv"
                    write_csv(table_path, rows[:5000])
                    processed_table_path = str(table_path.relative_to(PROCESSED_DIR.parent))
                text = _table_to_text(record, rows, profile)
            else:
                issues.append(f"{file_type}_skipped")
                processing_status = "skipped"
        except Exception as exc:
            issues.append(f"processing_error:{type(exc).__name__}")
            processing_status = "error"

        text = normalize_text(text)
        if text and processing_status != "skipped":
            output_text_path.write_text(text, encoding="utf-8")
            processed_text_path = str(output_text_path.relative_to(PROCESSED_DIR.parent))
        else:
            processed_text_path = ""
            if file_type in {"pdf", "html", "txt"} and processing_status != "skipped":
                issues.append("empty_processed_text")
                processing_status = "warning"

        if processing_status == "ok" and issues:
            processing_status = "warning"

        for issue in sorted(set(issues)):
            issues_counter[issue.split(":")[0]] += 1

        processed_rows.append(
            {
                "document_id": record["document_id"],
                "title": record["title"],
                "file_type": file_type,
                "category": record["category"],
                "data_role": record.get("data_role", "other"),
                "is_content_document": bool(record.get("is_content_document")),
                "is_manifest_file": bool(record.get("is_manifest_file")),
                "is_system_file": bool(record.get("is_system_file")),
                "is_archive_file": bool(record.get("is_archive_file")),
                "source_url": record.get("source_url", ""),
                "source_domain": record.get("source_domain", ""),
                "relative_path": record["relative_path"],
                "processed_text_path": processed_text_path,
                "processed_table_path": processed_table_path,
                "text_length_chars": len(text),
                "word_count": len(text.split()),
                "page_count": page_count,
                "needs_ocr": needs_ocr,
                "processing_status": processing_status,
                "issues": sorted(set(issues)),
            }
        )

    report = _build_processing_report(processed_rows, table_profiles, issues_counter)
    return processed_rows, report


def _read_table_rows(path: Path, file_type: str) -> tuple[list[dict[str, Any]], list[str]]:
    if file_type == "json":
        return read_json_rows(path)
    if file_type == "csv":
        return read_csv_rows(path)
    if file_type == "xlsx":
        return read_xlsx_rows(path)
    return [], [f"unsupported_table_type:{file_type}"]


def _table_to_text(record: dict[str, Any], rows: list[dict[str, Any]], profile: dict[str, Any]) -> str:
    columns = ", ".join(column["name"] for column in profile.get("columns", [])[:30])
    sample = "\n".join(json.dumps(row, ensure_ascii=False) for row in rows[:20])
    return normalize_text(
        f"Bang du lieu: {record['title']}\n"
        f"Nguon: {record.get('source_url', '')}\n"
        f"So dong: {profile.get('row_count', 0)}\n"
        f"So cot: {profile.get('column_count', 0)}\n"
        f"Cot: {columns}\n"
        f"Mau du lieu:\n{sample}"
    )


def _build_processing_report(
    processed_rows: list[dict[str, Any]],
    table_profiles: list[dict[str, Any]],
    issues_counter: Counter[str],
) -> dict[str, Any]:
    status_counts = Counter(row["processing_status"] for row in processed_rows)
    file_type_counts = Counter(row["file_type"] for row in processed_rows)
    missing_summary: dict[str, Any] = {"tables": 0, "columns_with_missing": 0, "total_missing_cells": 0}
    outlier_summary: dict[str, Any] = {"tables": 0, "columns_with_outliers": 0, "total_outliers": 0}
    duplicate_table_rows = 0
    for item in table_profiles:
        profile = item["profile"]
        missing_summary["tables"] += 1
        outlier_summary["tables"] += 1
        duplicate_table_rows += int(profile.get("duplicate_rows", 0) or 0)
        for column in profile.get("columns", []):
            if column.get("missing_count", 0) > 0:
                missing_summary["columns_with_missing"] += 1
                missing_summary["total_missing_cells"] += int(column["missing_count"])
        for count in profile.get("outliers", {}).values():
            outlier_summary["columns_with_outliers"] += 1
            outlier_summary["total_outliers"] += int(count)
    return {
        "created_at": utc_now(),
        "total_catalog_records": len(processed_rows),
        "processed_documents": sum(1 for row in processed_rows if row["processed_text_path"]),
        "status_counts": dict(status_counts),
        "file_type_counts": dict(file_type_counts),
        "pdf_needs_ocr_count": sum(1 for row in processed_rows if row.get("needs_ocr")),
        "missing_summary": missing_summary,
        "outlier_summary": outlier_summary,
        "duplicate_table_rows": duplicate_table_rows,
        "issue_counts": dict(issues_counter),
        "table_profiles": table_profiles,
    }


def write_quality_report(report: dict[str, Any], processed_rows: list[dict[str, Any]]) -> None:
    lines = [
        "# Bao cao chat luong du lieu",
        "",
        f"- Created at: `{report['created_at']}`",
        f"- Tong catalog records: **{report['total_catalog_records']}**",
        f"- Documents co processed text: **{report['processed_documents']}**",
        f"- PDF can OCR: **{report['pdf_needs_ocr_count']}**",
        f"- Duplicate table rows: **{report['duplicate_table_rows']}**",
        "",
        "## Status",
        "",
        "| Status | Count |",
        "|---|---:|",
    ]
    for status, count in sorted(report["status_counts"].items()):
        lines.append(f"| {status} | {count} |")
    lines.extend(
        [
            "",
            "## Missing / Null",
            "",
            f"- Tables checked: {report['missing_summary']['tables']}",
            f"- Columns co missing/null: {report['missing_summary']['columns_with_missing']}",
            f"- Tong missing cells: {report['missing_summary']['total_missing_cells']}",
            "",
            "## Outliers",
            "",
            f"- Tables checked: {report['outlier_summary']['tables']}",
            f"- Columns co outlier: {report['outlier_summary']['columns_with_outliers']}",
            f"- Tong outliers: {report['outlier_summary']['total_outliers']}",
            "",
            "## Issue counts",
            "",
            "| Issue | Count |",
            "|---|---:|",
        ]
    )
    if report["issue_counts"]:
        for issue, count in sorted(report["issue_counts"].items()):
            lines.append(f"| {issue} | {count} |")
    else:
        lines.append("| none | 0 |")
    lines.extend(["", "## Sample problematic records", ""])
    problematic = [row for row in processed_rows if row.get("issues")]
    for row in problematic[:30]:
        lines.append(f"- `{row['document_id']}` `{row['file_type']}` {row['relative_path']}: {', '.join(row['issues'][:8])}")
    if not problematic:
        lines.append("- Khong co issue.")
    (REPORTS_DIR / "data_quality_report.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Process raw documents into clean text and table summaries.")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--skip-pdf-text", action="store_true")
    args = parser.parse_args()
    rows, report = process_documents(limit=args.limit, skip_pdf_text=args.skip_pdf_text)
    write_jsonl(PROCESSED_DIR / "documents" / "processed_documents.jsonl", rows)
    write_json(REPORTS_DIR / "processing_report.json", report)
    write_quality_report(report, rows)
    print(
        json.dumps(
            {
                "processed_records": len(rows),
                "processed_documents": report["processed_documents"],
                "status_counts": report["status_counts"],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
