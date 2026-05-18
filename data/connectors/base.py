from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass
class ConnectorResult:
    name: str
    type: str
    status: str
    message: str
    records: int = 0
    metadata: dict[str, Any] | None = None


class DataConnector(Protocol):
    name: str
    type: str
    status: str

    def test_connection(self) -> ConnectorResult:
        ...

    def ingest(self) -> ConnectorResult:
        ...
