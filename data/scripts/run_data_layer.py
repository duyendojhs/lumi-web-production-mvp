from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent
HISTORY_PATH = DATA_DIR / "reports" / "pipeline_run_history.jsonl"


def run_step(script_name: str, extra_args: list[str]) -> None:
    command = [sys.executable, str(SCRIPT_DIR / script_name), *extra_args]
    print(f"[data-layer] Running {script_name}")
    subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Lumi local data layer pipeline.")
    parser.add_argument("--skip-pdf-text", action="store_true", help="Skip PDF text extraction for faster smoke runs.")
    parser.add_argument("--force", action="store_true", help="Regenerate outputs. Raw data is never deleted or modified.")
    parser.add_argument("--limit", type=int, default=None, help="Process only the first N raw files for smoke testing.")
    args = parser.parse_args()
    started_at = datetime.now(timezone.utc)
    started = time.perf_counter()
    status = "success"
    error = ""

    try:
        common_args: list[str] = []
        if args.limit:
            common_args.extend(["--limit", str(args.limit)])

        inspect_args = list(common_args)
        process_args = list(common_args)
        if args.skip_pdf_text:
            inspect_args.append("--skip-pdf-text")
            process_args.append("--skip-pdf-text")

        run_step("inspect_raw_data.py", inspect_args)
        run_step("ingest_raw_data.py", common_args)
        run_step("process_documents.py", process_args)
        run_step("build_features.py", common_args)
        run_step("ocr_pdf_queue.py", common_args)
        run_step("build_observability.py", [])
        print("[data-layer] Done")
    except Exception as exc:
        status = "error"
        error = f"{type(exc).__name__}: {exc}"
        raise
    finally:
        finished_at = datetime.now(timezone.utc)
        append_run_history(started_at, finished_at, time.perf_counter() - started, status, error)


def append_run_history(started_at: datetime, finished_at: datetime, duration_sec: float, status: str, error: str) -> None:
    stats = read_json(DATA_DIR / "features" / "statistics" / "data_statistics.json", {})
    ocr = read_json(DATA_DIR / "reports" / "pdf_ocr_queue.json", {})
    issue_counts = stats.get("issue_counts") or {}
    record = {
        "run_id": started_at.strftime("run_%Y%m%d_%H%M%S"),
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_sec": round(duration_sec, 2),
        "raw_files": stats.get("total_raw_files", 0),
        "content_docs": stats.get("content_documents", 0),
        "processed_docs": stats.get("content_processed_text_documents", 0),
        "chunks": stats.get("content_chunks", 0),
        "issues_count": sum(int(value) for value in issue_counts.values()) if isinstance(issue_counts, dict) else 0,
        "ocr_queue_count": ocr.get("total_pdf_needing_ocr", stats.get("pdf_needs_ocr_count", 0)),
        "overall_health": stats.get("overall_data_health", 0),
        "status": status,
        "error": error,
    }
    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    with HISTORY_PATH.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def read_json(path: Path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


if __name__ == "__main__":
    main()
