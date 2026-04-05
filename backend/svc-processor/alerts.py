"""Alert detector — checks thresholds, generates WARNING/CAUTION/ADVISORY alerts."""

from datetime import datetime, timezone
from typing import Optional
import uuid

ALERT_RULES = {
    "water_temp_inlet": {
        "WARNING": {"condition": "crit_max", "voice": "ТЕМПЕРАТУРА ВОДЫ КРИТИЧНА. СНЯТЬ НАГРУЗКУ", "message": "Температура воды на входе: {value}°C (предел {threshold}°C)"},
        "CAUTION": {"condition": "warn_max", "voice": "ВНИМАНИЕ. ТЕМПЕРАТУРА ВОДЫ", "message": "Температура воды на входе повышена: {value}°C"},
    },
    "water_temp_outlet": {
        "WARNING": {"condition": "crit_max", "voice": "ТЕМПЕРАТУРА ВОДЫ КРИТИЧНА. СНЯТЬ НАГРУЗКУ", "message": "Температура воды на выходе: {value}°C (предел {threshold}°C)"},
        "CAUTION": {"condition": "warn_max", "voice": "ВНИМАНИЕ. ТЕМПЕРАТУРА ВОДЫ", "message": "Температура воды на выходе повышена: {value}°C"},
    },
    "oil_temp_inlet": {
        "WARNING": {"condition": "crit_max", "voice": "ТЕМПЕРАТУРА МАСЛА КРИТИЧНА. СНЯТЬ НАГРУЗКУ", "message": "Температура масла: {value}°C (предел {threshold}°C)"},
        "CAUTION": {"condition": "warn_max", "voice": "ВНИМАНИЕ. ТЕМПЕРАТУРА МАСЛА", "message": "Температура масла повышена: {value}°C"},
    },
    "oil_temp_outlet": {
        "WARNING": {"condition": "crit_max", "voice": "ТЕМПЕРАТУРА МАСЛА КРИТИЧНА. СНЯТЬ НАГРУЗКУ", "message": "Температура масла: {value}°C (предел {threshold}°C)"},
        "CAUTION": {"condition": "warn_max", "voice": "ВНИМАНИЕ. ТЕМПЕРАТУРА МАСЛА", "message": "Температура масла повышена: {value}°C"},
    },
    "oil_pressure_kpa": {
        "WARNING": {"condition": "crit_min", "voice": "ДАВЛЕНИЕ МАСЛА КРИТИЧНО", "message": "Давление масла: {value} кПа (предел {threshold} кПа)"},
        "CAUTION": {"condition": "warn_min", "voice": "ВНИМАНИЕ. ДАВЛЕНИЕ МАСЛА", "message": "Давление масла снижено: {value} кПа"},
    },
    "main_reservoir_pressure": {
        "WARNING": {"condition": "crit_min", "voice": "ДАВЛЕНИЕ В ГЛАВНЫХ РЕЗЕРВУАРАХ", "message": "Давление ГР: {value} кгс/см² (предел {threshold})"},
        "CAUTION": {"condition": "warn_min", "voice": "ВНИМАНИЕ. ДАВЛЕНИЕ В ГЛАВНЫХ РЕЗЕРВУАРАХ", "message": "Давление ГР снижено: {value} кгс/см²"},
    },
    "fuel_level": {
        "WARNING": {"condition": "crit_min", "voice": "ТОПЛИВО КРИТИЧНО", "message": "Уровень топлива: {value}%"},
        "CAUTION": {"condition": "warn_min", "voice": "ВНИМАНИЕ. НИЗКИЙ УРОВЕНЬ ТОПЛИВА", "message": "Топливо: {value}%"},
    },
}

BINARY_ALERTS = {
    "ground_fault_power": {
        "level": "WARNING",
        "voice": "ЗАМЫКАНИЕ НА ЗЕМЛЮ. НАГРУЗКА СНЯТА",
        "message": "Замыкание на землю в силовых цепях",
    },
    "ground_fault_aux": {
        "level": "CAUTION",
        "voice": "ВНИМАНИЕ. ЗАМЫКАНИЕ ВСПОМОГАТЕЛЬНЫХ ЦЕПЕЙ",
        "message": "Замыкание на землю во вспомогательных цепях",
    },
    "wheel_slip": {
        "level": "CAUTION",
        "voice": "БОКСОВАНИЕ",
        "message": "Обнаружено боксование колёсных пар",
    },
}


def detect_alerts(
    telemetry: dict,
    thresholds: dict[str, dict],
    active_alerts: dict[str, dict],
) -> tuple[list[dict], list[str]]:
    """Returns (new_alerts, resolved_alert_keys)."""
    new_alerts = []
    resolved_keys = []

    for param_id, rules in ALERT_RULES.items():
        value = telemetry.get(param_id)
        th = thresholds.get(param_id)
        if value is None or th is None:
            continue

        triggered_level = None

        if "WARNING" in rules:
            rule = rules["WARNING"]
            cond = rule["condition"]
            threshold_val = th[cond]
            if ("max" in cond and value > threshold_val) or ("min" in cond and value < threshold_val):
                triggered_level = "WARNING"
                triggered_rule = rule
                triggered_threshold = threshold_val

        if triggered_level is None and "CAUTION" in rules:
            rule = rules["CAUTION"]
            cond = rule["condition"]
            threshold_val = th[cond]
            if ("max" in cond and value > threshold_val) or ("min" in cond and value < threshold_val):
                triggered_level = "CAUTION"
                triggered_rule = rule
                triggered_threshold = threshold_val

        alert_key = f"{telemetry['locomotive_id']}:{param_id}"

        if triggered_level:
            if alert_key not in active_alerts:
                new_alerts.append({
                    "id": str(uuid.uuid4())[:8],
                    "locomotive_id": telemetry["locomotive_id"],
                    "timestamp": telemetry.get("timestamp", datetime.now(timezone.utc).isoformat()),
                    "level": triggered_level,
                    "param": param_id,
                    "message": triggered_rule["message"].format(value=value, threshold=triggered_threshold),
                    "voice_text": triggered_rule["voice"],
                    "value": value,
                    "threshold": triggered_threshold,
                    "status": "active",
                })
        else:
            if alert_key in active_alerts:
                resolved_keys.append(alert_key)

    for event_id, rule in BINARY_ALERTS.items():
        value = telemetry.get(event_id, False)
        alert_key = f"{telemetry['locomotive_id']}:{event_id}"

        if value:
            if alert_key not in active_alerts:
                new_alerts.append({
                    "id": str(uuid.uuid4())[:8],
                    "locomotive_id": telemetry["locomotive_id"],
                    "timestamp": telemetry.get("timestamp", datetime.now(timezone.utc).isoformat()),
                    "level": rule["level"],
                    "param": event_id,
                    "message": rule["message"],
                    "voice_text": rule["voice"],
                    "value": 1,
                    "threshold": 0,
                    "status": "active",
                })
        else:
            if alert_key in active_alerts:
                resolved_keys.append(alert_key)

    return new_alerts, resolved_keys
