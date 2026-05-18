from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from data_layer_common import DATA_DIR, FEATURES_DIR, METADATA_DIR, PROCESSED_DIR, RAW_DIR, sha256_file, utc_now, write_json


SNAPSHOT_DIR = METADATA_DIR / "snapshots"
STORAGE_POLICY = METADATA_DIR / "storage_policy.json"


def create_snapshot() -> dict[str, Any]:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = utc_now().replace(":", "").replace("-", "").split(".")[0].replace("T", "_").replace("+0000", "")
    snapshot = {
        "dataset_name": "lumi_local_data_layer",
        "version": f"snapshot_{stamp}",
        "generated_at": utc_now(),
        "pipeline_version": "local-data-layer-v1",
        "raw": summarize_tree(RAW_DIR),
        "processed": summarize_tree(PROCESSED_DIR),
        "features": summarize_tree(FEATURES_DIR),
        "metadata": summarize_tree(METADATA_DIR, exclude_prefixes=["snapshots"]),
        "pipeline_steps": [
            "inspect_raw_data.py",
            "ingest_raw_data.py",
            "process_documents.py",
            "build_features.py",
            "ocr_pdf_queue.py",
            "build_observability.py",
            "build_rag_index.py",
        ],
        "reproducibility_command": "python data\\scripts\\run_data_layer.py",
        "notes": ["Snapshot stores checksums/summary only; it does not copy raw data."],
    }
    path = SNAPSHOT_DIR / f"{snapshot['version']}.json"
    write_json(path, snapshot)
    write_json(SNAPSHOT_DIR / "latest_snapshot.json", {**snapshot, "snapshot_path": str(path)})
    write_json(STORAGE_POLICY, storage_policy())
    return {**snapshot, "snapshot_path": str(path)}


def summarize_tree(root: Path, exclude_prefixes: list[str] | None = None) -> dict[str, Any]:
    exclude_prefixes = exclude_prefixes or []
    files = []
    total_size = 0
    checksum = []
    if root.exists():
        for path in sorted(item for item in root.rglob("*") if item.is_file()):
            rel = path.relative_to(root).as_posix()
            if any(rel.startswith(prefix) for prefix in exclude_prefixes):
                continue
            size = path.stat().st_size
            total_size += size
            digest = sha256_file(path)
            checksum.append(digest)
            files.append({"relative_path": rel, "size_bytes": size, "sha256": digest})
    return {
        "path": str(root),
        "total_files": len(files),
        "total_size_bytes": total_size,
        "checksum_summary": sha256_text("|".join(checksum)),
        "sample_files": files[:20],
    }


def sha256_text(value: str) -> str:
    import hashlib

    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def storage_policy() -> dict[str, Any]:
    return {
        "generated_at": utc_now(),
        "local_storage": {"status": "implemented", "paths": ["data/raw", "data/processed", "data/features", "data/metadata", "data/reports"]},
        "dvc": {"status": "planned", "note": "Use DVC for versioned large data artifacts when moving beyond local demo."},
        "s3": {"status": "planned", "note": "Object storage target for production deployment."},
        "hdfs": {"status": "planned", "note": "Distributed storage option for big-data scale."},
        "guidance": [
            "Do not commit large raw data bundles to app source repositories.",
            "Commit metadata, schema, reports and small manifests when useful.",
            "Use timestamped snapshot manifests for reproducibility.",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Create local dataset snapshot manifest without copying raw data.")
    parser.parse_args()
    snapshot = create_snapshot()
    print(json.dumps({"version": snapshot["version"], "snapshot_path": snapshot["snapshot_path"], "raw_files": snapshot["raw"]["total_files"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
