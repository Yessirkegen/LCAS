"""Data Quality Score — measures reliability of each sensor per locomotive."""

import time
from collections import defaultdict

_spike_counts: dict[str, int] = defaultdict(int)
_total_counts: dict[str, int] = defaultdict(int)
_null_counts: dict[str, int] = defaultdict(int)

PHYSICAL_BOUNDS = {
    "speed_kmh": (-1, 200),
    "water_temp_inlet": (-50, 500),
    "water_temp_outlet": (-50, 500),
    "oil_temp_inlet": (-50, 300),
    "oil_temp_outlet": (-50, 300),
    "water_pressure_kpa": (-10, 2000),
    "oil_pressure_kpa": (-10, 2000),
    "main_reservoir_pressure": (0, 15),
    "traction_current": (-10, 1500),
    "fuel_level": (-1, 101),
}


def compute_data_quality(loco_id: str, data: dict) -> dict[str, float]:
    scores = {}

    for param, (lo, hi) in PHYSICAL_BOUNDS.items():
        key = f"{loco_id}:{param}"
        value = data.get(param)
        _total_counts[key] += 1

        if value is None:
            _null_counts[key] += 1
        elif value < lo or value > hi:
            _spike_counts[key] += 1

        total = _total_counts[key]
        bad = _spike_counts[key] + _null_counts[key]
        quality = max(0, (1 - bad / total) * 100) if total > 0 else 100
        scores[param] = round(quality, 1)

    overall = sum(scores.values()) / len(scores) if scores else 100
    scores["_overall"] = round(overall, 1)
    return scores
