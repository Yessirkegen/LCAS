"""Rate Adaptive Streaming + Delta Compression + Graceful Degradation."""

import json
import time
from collections import defaultdict

_last_sent: dict[str, dict] = defaultdict(dict)
_last_sent_time: dict[str, float] = defaultdict(float)

PRIORITY_FIELDS = {"health_index", "hi_letter", "hi_category", "speed_kmh", "locomotive_id"}
SECONDARY_FIELDS = {"water_temp_outlet", "oil_temp_outlet", "water_pressure_kpa", "oil_pressure_kpa", "main_reservoir_pressure", "traction_current"}
TERTIARY_FIELDS = {"fuel_level", "fuel_consumption", "lat", "lon", "air_temp_collector", "generator_voltage", "generator_current"}


def get_update_interval(hi_value: float | None) -> float:
    if hi_value is None:
        return 3.0
    if hi_value < 50:
        return 0.2  # critical — fastest
    if hi_value < 80:
        return 1.0  # attention
    return 5.0  # normal — slowest


def should_send(loco_id: str, hi_value: float | None) -> bool:
    interval = get_update_interval(hi_value)
    now = time.time()
    last = _last_sent_time.get(loco_id, 0)
    if now - last >= interval:
        _last_sent_time[loco_id] = now
        return True
    return False


def compute_delta(loco_id: str, full_data: dict) -> dict:
    prev = _last_sent.get(loco_id, {})
    delta = {"locomotive_id": loco_id, "_delta": True}
    changed = False

    for key in PRIORITY_FIELDS:
        if key in full_data:
            delta[key] = full_data[key]

    for key in {**dict.fromkeys(SECONDARY_FIELDS), **dict.fromkeys(TERTIARY_FIELDS)}:
        val = full_data.get(key)
        prev_val = prev.get(key)
        if val != prev_val:
            delta[key] = val
            changed = True

    _last_sent[loco_id] = dict(full_data)

    if not changed and len(delta) <= len(PRIORITY_FIELDS) + 1:
        delta["_no_change"] = True

    return delta


def prioritize_for_degradation(data: dict, connection_quality: str = "good") -> dict:
    if connection_quality == "good":
        return data

    result = {k: data[k] for k in PRIORITY_FIELDS if k in data}

    if connection_quality == "medium":
        result.update({k: data[k] for k in SECONDARY_FIELDS if k in data})

    return result
