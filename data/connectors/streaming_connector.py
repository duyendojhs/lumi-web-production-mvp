from __future__ import annotations

from .base import ConnectorResult


class StreamingConnector:
    name = "Kafka/RabbitMQ connector"
    type = "streaming"
    status = "planned"

    def test_connection(self) -> ConnectorResult:
        return ConnectorResult(self.name, self.type, "planned", "Streaming ingestion is documented as roadmap.")

    def ingest(self) -> ConnectorResult:
        return ConnectorResult(self.name, self.type, "planned", "No Kafka/RabbitMQ service is required for local demo.")
