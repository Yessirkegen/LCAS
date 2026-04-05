"""Health Index calculator — weighted score with penalties and prediction."""

from typing import Optional


def calculate_score(
    value: Optional[float],
    norm_min: float, norm_max: float,
    warn_min: float, warn_max: float,
    crit_min: float, crit_max: float,
) -> float:
    if value is None:
        return 100.0

    if norm_min <= value <= norm_max:
        return 100.0

    if warn_min <= value < norm_min:
        span = norm_min - warn_min
        return 50.0 + 50.0 * (value - warn_min) / span if span > 0 else 50.0

    if norm_max < value <= warn_max:
        span = warn_max - norm_max
        return 50.0 + 50.0 * (warn_max - value) / span if span > 0 else 50.0

    if crit_min <= value < warn_min:
        span = warn_min - crit_min
        return 50.0 * (value - crit_min) / span if span > 0 else 0.0

    if warn_max < value <= crit_max:
        span = crit_max - warn_max
        return 50.0 * (crit_max - value) / span if span > 0 else 0.0

    return 0.0


def compute_health_index(
    telemetry: dict,
    thresholds: dict[str, dict],
    weights: dict[str, float],
    penalties: dict[str, float],
) -> dict:
    scores = {}
    total_weight = 0
    weighted_sum = 0

    for param_id, w in weights.items():
        value = telemetry.get(param_id)
        th = thresholds.get(param_id)
        if th is None:
            continue

        score = calculate_score(
            value,
            th["norm_min"], th["norm_max"],
            th["warn_min"], th["warn_max"],
            th["crit_min"], th["crit_max"],
        )
        scores[param_id] = score
        weighted_sum += w * score
        total_weight += w

    raw_hi = weighted_sum / total_weight if total_weight > 0 else 100.0

    total_penalty = 0
    penalties_applied = []

    binary_checks = {
        "ground_fault_power": telemetry.get("ground_fault_power", False),
        "ground_fault_aux": telemetry.get("ground_fault_aux", False),
        "wheel_slip": telemetry.get("wheel_slip", False),
    }

    for event_id, is_active in binary_checks.items():
        if is_active and event_id in penalties:
            pen = penalties[event_id]
            total_penalty += pen
            penalties_applied.append({"event": event_id, "penalty": pen})

    hi = max(0, min(100, raw_hi + total_penalty))

    top_factors = []
    for param_id, score in scores.items():
        w = weights.get(param_id, 0)
        loss = w * (100.0 - score)
        if loss > 0:
            top_factors.append({
                "param": param_id,
                "value": telemetry.get(param_id),
                "score": round(score, 1),
                "weight": w,
                "impact": round(loss, 1),
            })
    top_factors.sort(key=lambda x: x["impact"], reverse=True)

    if hi >= 80:
        category = "normal"
        letter = "A" if hi >= 90 else "B"
    elif hi >= 50:
        category = "attention"
        letter = "C" if hi >= 60 else "D"
    else:
        category = "critical"
        letter = "E"

    return {
        "value": round(hi, 1),
        "letter": letter,
        "category": category,
        "top_factors": top_factors[:5],
        "penalties_applied": penalties_applied,
    }
