from __future__ import annotations

from pathlib import Path

from .base import ConnectorResult


class FileConnector:
    name = "Local raw file connector"
    type = "file"
    status = "implemented"

    def __init__(self, raw_path: str | Path = "data/raw") -> None:
        self.raw_path = Path(raw_path)

    def test_connection(self) -> ConnectorResult:
        exists = self.raw_path.exists()
        return ConnectorResult(self.name, self.type, "ready" if exists else "error", f"{self.raw_path} exists={exists}")

    def ingest(self) -> ConnectorResult:
        files = [path for path in self.raw_path.rglob("*") if path.is_file()] if self.raw_path.exists() else []
        return ConnectorResult(self.name, self.type, "ready", "Local file ingestion is handled by data/scripts/run_data_layer.py", len(files))
