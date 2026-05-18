from __future__ import annotations

import argparse
import json
import shutil
from typing import Any

from data_layer_common import METADATA_DIR, REPORTS_DIR, read_jsonl, utc_now, write_json


def build_ocr_queue(limit: int | None = None) -> dict[str, Any]:
    catalog_path = METADATA_DIR / "data_catalog.json"
    processed_path = METADATA_DIR.parent / "processed" / "documents" / "processed_documents.jsonl"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.exists() else []
    processed_rows = read_jsonl(processed_path)
    processed_by_id = {row["document_id"]: row for row in processed_rows}
    rows: list[dict[str, Any]] = []

    for item in catalog:
        if item.get("file_type") != "pdf" or not item.get("is_content_document"):
            continue
        processed = processed_by_id.get(item["document_id"], {})
        if not processed.get("needs_ocr"):
            continue
        rows.append(
            {
                "document_id": item["document_id"],
                "title": item.get("title", ""),
                "relative_path": item.get("relative_path", ""),
                "source_url": item.get("source_url", ""),
                "category": item.get("category", "khac"),
                "file_size_bytes": item.get("file_size_bytes", 0),
                "page_count": item.get("page_count", 0),
                "text_length_chars": processed.get("text_length_chars", 0),
                "reason": "PDF text layer is empty or too short; OCR is required before high-quality RAG indexing.",
                "status": "manual_ocr_pending",
            }
        )

    rows.sort(key=lambda row: (row["category"], row["relative_path"]))
    if limit:
        rows = rows[:limit]
    tesseract_available = shutil.which("tesseract") is not None
    report = {
        "created_at": utc_now(),
        "total_pdf_needing_ocr": len(rows),
        "tesseract_available": tesseract_available,
        "status": "optional_manual_workflow",
        "suggested_command": "python data\\scripts\\ocr_pdf_queue.py --limit 10",
        "future_ocr_command": "python data\\scripts\\run_ocr_for_flagged_pdfs.py --limit 3",
        "items": rows,
    }
    return report


def write_markdown(report: dict[str, Any]) -> None:
    lines = [
        "# PDF OCR Queue",
        "",
        f"- Created at: `{report['created_at']}`",
        f"- Total PDF needing OCR: **{report['total_pdf_needing_ocr']}**",
        f"- Tesseract available: **{report['tesseract_available']}**",
        f"- Status: `{report['status']}`",
        "",
        "## Suggested workflow",
        "",
        "OCR is optional/manual in this local demo. Do not run OCR for every PDF unless the demo machine has enough time and OCR tools installed.",
        "",
        "```powershell",
        report["suggested_command"],
        "```",
        "",
        "## Top queue items",
        "",
        "| Document | Category | Pages | Text chars | Path |",
        "|---|---|---:|---:|---|",
    ]
    for item in report["items"][:50]:
        lines.append(
            f"| {item['title']} | {item['category']} | {item.get('page_count', 0)} | {item.get('text_length_chars', 0)} | `{item['relative_path']}` |"
        )
    (REPORTS_DIR / "pdf_ocr_queue.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a queue of PDFs that need OCR.")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    report = build_ocr_queue(limit=args.limit)
    write_json(REPORTS_DIR / "pdf_ocr_queue.json", report)
    write_markdown(report)
    print(json.dumps({"total_pdf_needing_ocr": report["total_pdf_needing_ocr"], "tesseract_available": report["tesseract_available"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
