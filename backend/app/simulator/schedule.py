"""Schedule — planned vs actual arrival times at stations."""

from datetime import datetime, timedelta, timezone


def compute_schedule(route_data: dict, distance_km: float, speed_kmh: float, start_time: datetime | None = None) -> list[dict]:
    if not start_time:
        start_time = datetime.now(timezone.utc) - timedelta(hours=1)

    stations = route_data.get("stations", [])
    if not stations or speed_kmh < 1:
        return []

    schedule = []
    for station in stations:
        km = station["km"]
        planned_hours = km / 70  # assume planned avg 70 km/h
        planned_time = start_time + timedelta(hours=planned_hours)

        if km <= distance_km:
            actual_hours = km / max(speed_kmh, 1)
            actual_time = start_time + timedelta(hours=actual_hours)
            delay_minutes = (actual_time - planned_time).total_seconds() / 60
            status = "passed"
        else:
            remaining_km = km - distance_km
            eta_hours = remaining_km / max(speed_kmh, 1)
            actual_time = datetime.now(timezone.utc) + timedelta(hours=eta_hours)
            delay_minutes = (actual_time - planned_time).total_seconds() / 60
            status = "upcoming"

        schedule.append({
            "station": station["name"],
            "km": km,
            "planned": planned_time.isoformat(),
            "actual": actual_time.isoformat() if status == "passed" else None,
            "eta": actual_time.isoformat() if status == "upcoming" else None,
            "delay_minutes": round(delay_minutes, 1),
            "status": status,
            "speed_limit": station.get("speed_limit"),
        })

    return schedule
