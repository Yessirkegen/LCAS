"""Fuel Efficiency Score — compares consumption to fleet average at similar load."""

import time
from collections import defaultdict

_consumption_history: dict[str, list[tuple[float, float, float]]] = defaultdict(list)
_fleet_baseline: dict[str, float] = {}

WINDOW_SECONDS = 3600
MIN_SAMPLES = 30


def update_fuel_data(loco_id: str, speed: float | None, consumption: float | None):
    if speed is None or consumption is None or speed < 5:
        return

    now = time.time()
    cutoff = now - WINDOW_SECONDS
    key = loco_id
    _consumption_history[key].append((now, speed, consumption))
    _consumption_history[key] = [(t, s, c) for t, s, c in _consumption_history[key] if t > cutoff]


def compute_fuel_efficiency(loco_id: str, speed: float | None, consumption: float | None) -> dict | None:
    if speed is None or consumption is None or speed < 5 or consumption < 10:
        return None

    all_consumptions = []
    for lid, entries in _consumption_history.items():
        for _, s, c in entries:
            if abs(s - speed) < 15:
                all_consumptions.append(c)

    if len(all_consumptions) < MIN_SAMPLES:
        return None

    fleet_avg = sum(all_consumptions) / len(all_consumptions)
    if fleet_avg < 1:
        return None

    efficiency = max(0, min(100, (1 - (consumption - fleet_avg) / fleet_avg) * 100))
    overuse_pct = ((consumption / fleet_avg) - 1) * 100

    return {
        "efficiency_score": round(efficiency, 1),
        "current_consumption": round(consumption, 1),
        "fleet_average": round(fleet_avg, 1),
        "overuse_percent": round(overuse_pct, 1),
        "speed_kmh": round(speed, 0),
        "samples": len(all_consumptions),
    }
