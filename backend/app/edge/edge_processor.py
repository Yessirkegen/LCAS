"""Edge Processor — lightweight version that runs on-board the locomotive.
Calculates HI and alerts locally without server connection.
Buffers data for sync when connection returns."""

import json
import time
import sqlite3
import logging
from pathlib import Path
from datetime import datetime, timezone

from app.processor.health_index import compute_health_index
from app.processor.alerts import detect_alerts

logger = logging.getLogger(__name__)

DEFAULT_DB_PATH = "/tmp/edge_buffer.db"


class EdgeProcessor:
    def __init__(self, loco_id: str, thresholds: dict, weights: dict, penalties: dict, db_path: str = DEFAULT_DB_PATH):
        self.loco_id = loco_id
        self.thresholds = thresholds
        self.weights = weights
        self.penalties = penalties
        self.active_alerts: dict[str, dict] = {}
        self.online = False
        self.buffer_count = 0

        self.db = sqlite3.connect(db_path)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_buffer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                data TEXT,
                synced INTEGER DEFAULT 0
            )
        """)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS alert_buffer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                alert TEXT,
                synced INTEGER DEFAULT 0
            )
        """)
        self.db.commit()

    def process(self, telemetry: dict) -> dict:
        hi_result = compute_health_index(telemetry, self.thresholds, self.weights, self.penalties)

        new_alerts, resolved = detect_alerts(telemetry, self.thresholds, self.active_alerts)
        for alert in new_alerts:
            key = f"{self.loco_id}:{alert['param']}"
            self.active_alerts[key] = alert
        for key in resolved:
            self.active_alerts.pop(key, None)

        current_alerts = [a for k, a in self.active_alerts.items() if k.startswith(f"{self.loco_id}:")]

        self._buffer_telemetry(telemetry)
        for alert in new_alerts:
            self._buffer_alert(alert)

        return {
            "health_index": hi_result,
            "alerts": current_alerts,
            "mode": "online" if self.online else "autonomous",
            "buffer_count": self.buffer_count,
        }

    def _buffer_telemetry(self, data: dict):
        self.db.execute(
            "INSERT INTO telemetry_buffer (timestamp, data) VALUES (?, ?)",
            (datetime.now(timezone.utc).isoformat(), json.dumps(data, default=str)),
        )
        self.buffer_count += 1
        if self.buffer_count % 100 == 0:
            self.db.commit()

    def _buffer_alert(self, alert: dict):
        self.db.execute(
            "INSERT INTO alert_buffer (timestamp, alert) VALUES (?, ?)",
            (datetime.now(timezone.utc).isoformat(), json.dumps(alert, default=str)),
        )
        self.db.commit()

    def get_unsynced_count(self) -> int:
        row = self.db.execute("SELECT count(*) FROM telemetry_buffer WHERE synced = 0").fetchone()
        return row[0] if row else 0

    def get_unsynced_batch(self, batch_size: int = 100) -> list[dict]:
        rows = self.db.execute(
            "SELECT id, timestamp, data FROM telemetry_buffer WHERE synced = 0 ORDER BY id ASC LIMIT ?",
            (batch_size,),
        ).fetchall()
        return [{"id": r[0], "timestamp": r[1], "data": json.loads(r[2])} for r in rows]

    def mark_synced(self, ids: list[int]):
        if not ids:
            return
        placeholders = ",".join("?" * len(ids))
        self.db.execute(f"UPDATE telemetry_buffer SET synced = 1 WHERE id IN ({placeholders})", ids)
        self.db.commit()

    def cleanup_old(self, max_hours: int = 72):
        cutoff = datetime.now(timezone.utc).isoformat()
        self.db.execute("DELETE FROM telemetry_buffer WHERE synced = 1")
        self.db.commit()

    def close(self):
        self.db.commit()
        self.db.close()
