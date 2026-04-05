"""Anomaly detection — statistical outlier detection using μ ± 3σ per parameter per locomotive."""

import time
import math
from collections import defaultdict

_history: dict[str, list[tuple[float, float]]] = defaultdict(list)

WINDOW_SECONDS = 3600  # 1 hour baseline
MIN_SAMPLES = 60
SIGMA_THRESHOLD = 3.0

MONITORED_PARAMS = [
    "water_temp_inlet", "water_temp_outlet",
    "oil_temp_inlet", "oil_temp_outlet",
    "water_pressure_kpa", "oil_pressure_kpa",
    "traction_current", "fuel_consumption",
]


def _mean_std(values: list[float]) -> tuple[float, float]:
    n = len(values)
    if n < 2:
        return values[0] if values else 0, 0
    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / (n - 1)
    return mean, math.sqrt(variance)


def detect_anomalies(loco_id: str, data: dict) -> list[dict]:
    anomalies = []
    now = time.time()
    cutoff = now - WINDOW_SECONDS

    for param in MONITORED_PARAMS:
        value = data.get(param)
        if value is None or not isinstance(value, (int, float)):
            continue

        key = f"{loco_id}:{param}"
        _history[key].append((now, value))
        _history[key] = [(t, v) for t, v in _history[key] if t > cutoff]

        if len(_history[key]) < MIN_SAMPLES:
            continue

        values = [v for _, v in _history[key][:-1]]
        mean, std = _mean_std(values)

        if std < 0.001:
            continue

        z_score = abs(value - mean) / std
        if z_score > SIGMA_THRESHOLD:
            anomalies.append({
                "param": param,
                "value": round(value, 2),
                "mean": round(mean, 2),
                "std": round(std, 2),
                "z_score": round(z_score, 1),
                "message": f"Аномалия {param}: {value:.1f} (норма {mean:.1f} ± {std:.1f})",
            })

    return anomalies
