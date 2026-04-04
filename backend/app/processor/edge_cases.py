"""Edge case handlers — stuck sensor, spikes, cold start, escalation."""

import time
import logging
from collections import defaultdict
from statistics import variance

logger = logging.getLogger(__name__)

_sensor_history: dict[str, list[tuple[float, float]]] = defaultdict(list)
_escalation_timers: dict[str, float] = {}

WINDOW_SECONDS = 120
MIN_SAMPLES = 10
MIN_VARIANCE = 0.01
ESCALATION_SECONDS = 30

ANALOG_PARAMS = [
    "water_temp_inlet", "water_temp_outlet",
    "oil_temp_inlet", "oil_temp_outlet",
    "air_temp_collector", "fuel_temp",
    "water_pressure_kpa", "oil_pressure_kpa", "air_pressure_kpa",
    "air_consumption", "main_reservoir_pressure", "brake_line_pressure",
    "traction_current", "generator_voltage", "generator_current",
    "fuel_level", "fuel_consumption", "speed_kmh",
]


def detect_stuck_sensors(loco_id: str, data: dict) -> list[str]:
    """Returns list of param_ids that appear stuck (zero variance)."""
    stuck = []
    now = time.time()
    cutoff = now - WINDOW_SECONDS

    for param in ANALOG_PARAMS:
        value = data.get(param)
        if value is None:
            continue

        key = f"{loco_id}:{param}"
        _sensor_history[key].append((now, value))
        _sensor_history[key] = [(t, v) for t, v in _sensor_history[key] if t > cutoff]

        entries = _sensor_history[key]
        if len(entries) < MIN_SAMPLES:
            continue

        values = [v for _, v in entries]
        try:
            var = variance(values)
            if var < MIN_VARIANCE:
                stuck.append(param)
        except Exception:
            pass

    return stuck


def detect_cold_start(data: dict) -> bool:
    """Detect cold start condition: speed=0 and all temps below norm_min."""
    speed = data.get("speed_kmh", 0)
    if speed is None or speed > 5:
        return False

    water_in = data.get("water_temp_inlet", 80)
    oil_in = data.get("oil_temp_inlet", 80)

    if water_in is not None and water_in < 40 and oil_in is not None and oil_in < 40:
        return True

    return False


def check_warning_escalation(loco_id: str, has_unacked_warning: bool) -> dict | None:
    """Check if WARNING has been unacknowledged too long -> escalate to dispatcher."""
    now = time.time()
    key = f"escalation:{loco_id}"

    if has_unacked_warning:
        if key not in _escalation_timers:
            _escalation_timers[key] = now
            return None

        elapsed = now - _escalation_timers[key]
        if elapsed > ESCALATION_SECONDS:
            return {
                "type": "escalation",
                "locomotive_id": loco_id,
                "message": f"WARNING без подтверждения >{int(elapsed)} сек",
                "elapsed_seconds": int(elapsed),
            }
    else:
        _escalation_timers.pop(key, None)

    return None
