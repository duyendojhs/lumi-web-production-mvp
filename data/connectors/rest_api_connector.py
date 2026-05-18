from __future__ import annotations

from .base import ConnectorResult


class RestApiConnector:
    name = "REST API connector"
    type = "rest_api"
    status = "demo"

    def __init__(self, endpoint: str | None = None) -> None:
        self.endpoint = endpoint

    def test_connection(self) -> ConnectorResult:
        if not self.endpoint:
            return ConnectorResult(self.name, self.type, "demo", "No endpoint configured; connector skeleton is ready.")
        return ConnectorResult(self.name, self.type, "demo", f"Endpoint configured for future ingestion: {self.endpoint}")

    def ingest(self) -> ConnectorResult:
        return ConnectorResult(self.name, self.type, "demo", "REST ingestion is a local demo placeholder; no external calls made.")
