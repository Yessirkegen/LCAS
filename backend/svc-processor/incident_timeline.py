"""Incident Timeline — auto-generates timeline when critical alert fires."""

import time
from collections import defaultdict
from datetime import datetime, timezone

_event_logs: dict[str, list[dict]] = defaultdict(list)
_incidents: dict[str, dict] = {}

MAX_EVENTS = 200


def log_event(loco_id: str, event_type: str, message: str, details: dict | None = None):
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": event_type,
        "message": message,
        "details": details or {},
    }
    _event_logs[loco_id].append(entry)
    if len(_event_logs[loco_id]) > MAX_EVENTS:
        _event_logs[loco_id] = _event_logs[loco_id][-MAX_EVENTS:]


def start_incident(loco_id: str, trigger_alert: dict) -> dict:
    incident = {
        "id": f"INC-{loco_id}-{int(time.time())}",
        "locomotive_id": loco_id,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "trigger": trigger_alert.get("message", "Unknown"),
        "trigger_param": trigger_alert.get("param", ""),
        "status": "active",
        "events": list(_event_logs.get(loco_id, [])[-50:]),
        "resolved_at": None,
    }
    _incidents[loco_id] = incident
    log_event(loco_id, "incident_start", f"Инцидент начат: {trigger_alert.get('message', '')}")
    return incident


def resolve_incident(loco_id: str) -> dict | None:
    incident = _incidents.pop(loco_id, None)
    if incident:
        incident["status"] = "resolved"
        incident["resolved_at"] = datetime.now(timezone.utc).isoformat()
        incident["events"] = list(_event_logs.get(loco_id, [])[-50:])
        log_event(loco_id, "incident_resolved", "Инцидент завершён")
    return incident


def get_active_incident(loco_id: str) -> dict | None:
    inc = _incidents.get(loco_id)
    if inc:
        inc["events"] = list(_event_logs.get(loco_id, [])[-50:])
    return inc


def get_event_log(loco_id: str, last_n: int = 50) -> list[dict]:
    return list(_event_logs.get(loco_id, [])[-last_n:])
