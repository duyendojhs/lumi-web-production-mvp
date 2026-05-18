from __future__ import annotations

from .base import ConnectorResult


class DatabaseConnector:
    name = "PostgreSQL/MySQL connector"
    type = "database"
    status = "planned"

    def __init__(self, dsn: str | None = None) -> None:
        self.dsn = dsn

    def test_connection(self) -> ConnectorResult:
        if not self.dsn:
            return ConnectorResult(self.name, self.type, "planned", "No DSN configured; database ingestion is planned.")
        return ConnectorResult(self.name, self.type, "demo", "DSN configured but no driver connection is executed in local demo.")

    def ingest(self) -> ConnectorResult:
        return ConnectorResult(self.name, self.type, "planned", "Database ingestion is planned for production.")
