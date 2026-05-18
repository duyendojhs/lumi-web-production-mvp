from __future__ import annotations

import argparse
import json
import zipfile
from collections import Counter, defaultdict
from typing import Any

from data_layer_common import (
    RAW_DIR,
    REPORTS_DIR,
    classify_file_type,
    ensure_data_dirs,
    extract_html_text,
    extract_pdf_text,
    looks_like_mojibake,
    read_csv_rows,
    read_json_rows,
    read_text_file,
    read_xlsx_rows,
    rel_path,
    sha256_file,
    table_profile,
    utc_now,
    write_json,
)


def scan_raw_data(limit: int | None = None, skip_pdf_text: bool = False) -> dict[str, Any]:
    ensure_data_dirs()
    files = [path for path in RAW_DIR.rglob("*") if path.is_file()]
    files.sort(key=lambda item: item.relative_to(RAW_DIR).as_posix())
    if limit:
        files = files[:limit]

    records: list[dict[str, Any]] = []
    checksum_groups: dict[str, list[str]] = defaultdict(list)

    for path in files:
        relative_path = rel_path(path)
        file_type = classify_file_type(path)
        size = path.stat().st_size
        issues: list[str] = []
        if size == 0:
            issues.append("empty_file")
        if size < 64 and file_type in {"pdf", "html", "txt", "json", "csv", "xlsx"}:
            issues.append("very_small_file")
        if size > 25 * 1024 * 1024:
            issues.append("large_file")
        if any(ord(ch) < 32 for ch in path.name):
            issues.append("suspicious_filename_control_char")

        checksum = sha256_file(path)
        checksum_groups[checksum].append(relative_path)

        probe: dict[str, Any] = {}
        try:
            if file_type in {"txt", "md"}:
                sample, encoding, text_issues = read_text_file(path, max_chars=20_000)
                issues.extend(text_issues)
                probe = {"encoding": encoding, "sample_text_length": len(sample)}
            elif file_type == "html":
                html_result = extract_html_text(path)
                issues.extend(html_result.get("issues", []))
                if not html_result.get("title"):
                    issues.append("html_missing_title")
                if len(html_result.get("text", "")) < 200:
                    issues.append("html_short_body")
                probe = {
                    "encoding": html_result.get("encoding"),
                    "title": html_result.get("title", ""),
                    "sample_text_length": len(html_result.get("text", "")),
                }
            elif file_type == "json":
                rows, parse_issues = read_json_rows(path)
                issues.extend(parse_issues)
                if looks_like_mojibake(json.dumps(rows[:20], ensure_ascii=False)):
                    issues.append("possible_mojibake")
                probe = {"row_count": len(rows), "table_profile": table_profile(rows[:200])}
            elif file_type == "csv":
                rows, parse_issues = read_csv_rows(path, max_rows=500)
                issues.extend(parse_issues)
                if looks_like_mojibake(json.dumps(rows[:20], ensure_ascii=False)):
                    issues.append("possible_mojibake")
                probe = {"row_count_sample": len(rows), "table_profile": table_profile(rows)}
            elif file_type == "xlsx":
                rows, parse_issues = read_xlsx_rows(path, max_rows=500)
                issues.extend(parse_issues)
                if looks_like_mojibake(json.dumps(rows[:20], ensure_ascii=False)):
                    issues.append("possible_mojibake")
                probe = {"row_count_sample": len(rows), "table_profile": table_profile(rows)}
            elif file_type == "pdf":
                if skip_pdf_text:
                    probe = {"pdf_text_probe": "skipped"}
                else:
                    pdf_result = extract_pdf_text(path, max_pages=2, max_chars=10_000)
                    issues.extend(pdf_result.get("issues", []))
                    if pdf_result.get("needs_ocr"):
                        issues.append("pdf_sample_needs_ocr")
                    probe = {
                        "page_count": pdf_result.get("page_count", 0),
                        "sample_text_length": pdf_result.get("text_length", 0),
                        "needs_ocr_sample": pdf_result.get("needs_ocr", False),
                    }
            elif file_type == "archive":
                try:
                    with zipfile.ZipFile(path) as archive:
                        probe = {"archive_members": len(archive.namelist())}
                except Exception as exc:
                    issues.append(f"archive_probe_error:{type(exc).__name__}")
        except Exception as exc:
            issues.append(f"probe_error:{type(exc).__name__}")

        records.append(
            {
                "relative_path": relative_path,
                "file_name": path.name,
                "extension": path.suffix.lower(),
                "file_type": file_type,
                "file_size_bytes": size,
                "checksum_sha256": checksum,
                "issues": sorted(set(issues)),
                "probe": probe,
            }
        )

    duplicate_groups = [
        {"checksum_sha256": checksum, "files": paths}
        for checksum, paths in checksum_groups.items()
        if len(paths) > 1
    ]
    duplicate_paths = {path for group in duplicate_groups for path in group["files"]}
    for record in records:
        if record["relative_path"] in duplicate_paths:
            record["issues"] = sorted(set(record["issues"] + ["duplicate_checksum"]))

    extension_counts = Counter(record["extension"] or "(none)" for record in records)
    type_counts = Counter(record["file_type"] for record in records)
    size_by_type = Counter()
    for record in records:
        size_by_type[record["file_type"]] += record["file_size_bytes"]

    return {
        "created_at": utc_now(),
        "raw_path": str(RAW_DIR),
        "total_files": len(records),
        "total_size_bytes": sum(record["file_size_bytes"] for record in records),
        "extension_distribution": dict(sorted(extension_counts.items())),
        "file_type_distribution": dict(sorted(type_counts.items())),
        "size_by_file_type_bytes": dict(sorted(size_by_type.items())),
        "empty_files": [record["relative_path"] for record in records if "empty_file" in record["issues"]],
        "duplicate_groups": duplicate_groups,
        "issue_counts": dict(Counter(issue.split(":")[0] for record in records for issue in record["issues"])),
        "files": records,
    }


def write_profile_markdown(report: dict[str, Any]) -> None:
    lines = [
        "# Bao cao ho so du lieu raw",
        "",
        f"- Raw path: `{report['raw_path']}`",
        f"- Created at: `{report['created_at']}`",
        f"- Tong file: **{report['total_files']}**",
        f"- Tong dung luong: **{report['total_size_bytes']:,} bytes**",
        "",
        "## Phan bo file type",
        "",
        "| File type | Count | Size bytes |",
        "|---|---:|---:|",
    ]
    for file_type, count in report["file_type_distribution"].items():
        lines.append(f"| {file_type} | {count} | {report['size_by_file_type_bytes'].get(file_type, 0):,} |")
    lines.extend(["", "## Van de phat hien", "", "| Issue | Count |", "|---|---:|"])
    if report["issue_counts"]:
        for issue, count in sorted(report["issue_counts"].items()):
            lines.append(f"| {issue} | {count} |")
    else:
        lines.append("| none | 0 |")
    lines.extend(["", "## Duplicate checksum groups", ""])
    if report["duplicate_groups"]:
        for group in report["duplicate_groups"][:30]:
            lines.append(f"- `{group['checksum_sha256'][:16]}`: {', '.join(group['files'])}")
    else:
        lines.append("- Khong phat hien duplicate checksum.")
    lines.extend(
        [
            "",
            "## Ghi chu",
            "",
            "- Script khong sua, khong xoa va khong ghi de file trong `data/raw`.",
            "- PDF chi duoc doc mau text layer; file scan se duoc danh dau can OCR trong buoc processing.",
        ]
    )
    (REPORTS_DIR / "data_profile_report.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect raw data files without modifying them.")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--skip-pdf-text", action="store_true")
    args = parser.parse_args()
    report = scan_raw_data(limit=args.limit, skip_pdf_text=args.skip_pdf_text)
    write_json(REPORTS_DIR / "ingestion_report.json", report)
    write_profile_markdown(report)
    print(
        json.dumps(
            {
                "total_files": report["total_files"],
                "total_size_bytes": report["total_size_bytes"],
                "issue_counts": report["issue_counts"],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
