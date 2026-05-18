from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

from data_layer_common import PROCESSED_DIR, REPORTS_DIR, RAW_DIR, utc_now, write_json


OCR_TEXT_DIR = PROCESSED_DIR / "ocr_text"
QUEUE_PATH = REPORTS_DIR / "pdf_ocr_queue.json"
REPORT_JSON = REPORTS_DIR / "ocr_batch_report.json"
REPORT_MD = REPORTS_DIR / "ocr_batch_report.md"


def run_ocr_batch(limit: int | None, dry_run: bool, dpi: int, lang: str) -> dict[str, Any]:
    OCR_TEXT_DIR.mkdir(parents=True, exist_ok=True)
    queue = _read_json(QUEUE_PATH, {})
    items = list(queue.get("items") or [])
    if limit:
        items = items[: max(0, limit)]

    tesseract = shutil.which("tesseract")
    pdftoppm = shutil.which("pdftoppm")
    can_ocr = bool(tesseract and pdftoppm and not dry_run)
    results: list[dict[str, Any]] = []

    for item in items:
        relative_path = str(item.get("relative_path") or item.get("raw_path") or "")
        raw_path = RAW_DIR / relative_path.replace("/", "\\")
        document_id = str(item.get("document_id") or Path(relative_path).stem)
        output_path = OCR_TEXT_DIR / f"{document_id}.txt"
        result = {
            "document_id": document_id,
            "title": item.get("title") or Path(relative_path).stem,
            "relative_path": relative_path,
            "raw_path": str(raw_path),
            "ocr_text_path": str(output_path),
            "ocr_status": "pending",
            "ocr_success": False,
            "ocr_chars": 0,
            "issues": [],
        }
        if dry_run:
            result["ocr_status"] = "dry_run"
            result["issues"].append("dry_run_no_files_written")
        elif not raw_path.exists():
            result["ocr_status"] = "failed"
            result["issues"].append("raw_pdf_missing")
        elif not tesseract:
            result["ocr_status"] = "unavailable"
            result["issues"].append("tesseract_not_found")
        elif not pdftoppm:
            result["ocr_status"] = "unavailable"
            result["issues"].append("pdftoppm_not_found")
        elif can_ocr:
            _ocr_pdf_with_cli(raw_path, output_path, dpi, lang, result)
        results.append(result)

    completed = sum(1 for row in results if row["ocr_success"])
    failed = sum(1 for row in results if row["ocr_status"] == "failed")
    unavailable = sum(1 for row in results if row["ocr_status"] == "unavailable")
    report = {
        "generated_at": utc_now(),
        "dry_run": dry_run,
        "limit": limit,
        "dpi": dpi,
        "lang": lang,
        "tesseract_available": bool(tesseract),
        "pdftoppm_available": bool(pdftoppm),
        "total_queue_items": len(queue.get("items") or []),
        "processed_items": len(results),
        "completed": completed,
        "failed": failed,
        "unavailable": unavailable,
        "pending": len(results) - completed - failed - unavailable,
        "command_hint": "python data\\scripts\\run_ocr_batch.py --limit 3",
        "notes": [
            "Raw PDFs are never modified.",
            "OCR requires local tesseract and pdftoppm/poppler installed.",
            "Use --dry-run to preview the queue safely.",
        ],
        "items": results,
    }
    write_json(REPORT_JSON, report)
    REPORT_MD.write_text(_markdown(report), encoding="utf-8")
    return report


def _ocr_pdf_with_cli(raw_path: Path, output_path: Path, dpi: int, lang: str, result: dict[str, Any]) -> None:
    temp_prefix = output_path.with_suffix("")
    try:
        subprocess.run(["pdftoppm", "-r", str(dpi), "-png", str(raw_path), str(temp_prefix)], check=True, capture_output=True)
        image_files = sorted(output_path.parent.glob(f"{temp_prefix.name}-*.png"))
        text_parts: list[str] = []
        for image_path in image_files:
            ocr_output = image_path.with_suffix("")
            subprocess.run(["tesseract", str(image_path), str(ocr_output), "-l", lang], check=True, capture_output=True)
            txt_path = ocr_output.with_suffix(".txt")
            if txt_path.exists():
                text_parts.append(txt_path.read_text(encoding="utf-8", errors="replace"))
        text = "\n\n".join(text_parts).strip()
        output_path.write_text(text, encoding="utf-8")
        result["ocr_status"] = "completed"
        result["ocr_success"] = bool(text)
        result["ocr_chars"] = len(text)
        if not text:
            result["issues"].append("ocr_empty_text")
    except Exception as exc:
        result["ocr_status"] = "failed"
        result["issues"].append(f"ocr_error:{type(exc).__name__}")


def _markdown(report: dict[str, Any]) -> str:
    lines = [
        "# OCR Batch Report",
        "",
        f"- Generated at: `{report['generated_at']}`",
        f"- Dry run: `{report['dry_run']}`",
        f"- Processed items: `{report['processed_items']}`",
        f"- Completed: `{report['completed']}`",
        f"- Failed: `{report['failed']}`",
        f"- Unavailable: `{report['unavailable']}`",
        f"- Tesseract available: `{report['tesseract_available']}`",
        f"- pdftoppm available: `{report['pdftoppm_available']}`",
        "",
        "## Top Items",
        "",
    ]
    for item in report["items"][:20]:
        lines.append(f"- `{item['ocr_status']}` {item['title']} -> `{item['ocr_text_path']}`")
    return "\n".join(lines) + "\n"


def _read_json(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def main() -> None:
    parser = argparse.ArgumentParser(description="Run optional OCR batch for PDFs flagged by pdf_ocr_queue.json.")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--dpi", type=int, default=220)
    parser.add_argument("--lang", default="vie+eng")
    args = parser.parse_args()
    report = run_ocr_batch(args.limit, args.dry_run, args.dpi, args.lang)
    print(json.dumps({key: report[key] for key in ["processed_items", "completed", "failed", "unavailable", "dry_run"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
