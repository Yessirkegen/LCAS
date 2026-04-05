"""Elevation profile — simulated altitude along routes."""

import math

ELEVATION_PROFILES = {
    "astana_karaganda": [
        (0, 347),     # Астана
        (20, 360),
        (42, 380),    # Сороковая
        (65, 420),
        (80, 460),    # подъём
        (95, 480),    # Агадырь (самая высокая)
        (120, 450),
        (148, 410),   # Спасский
        (170, 390),
        (193, 370),   # Карабас
        (210, 360),
        (230, 350),   # Караганда
    ],
    "almaty_shu": [
        (0, 780),     # Алматы
        (30, 700),
        (60, 620),
        (100, 550),
        (150, 480),
        (200, 430),
        (250, 400),
        (300, 390),   # Шу
    ],
    "loop": [
        (0, 347),
        (10, 355),
        (20, 365),
        (30, 360),
        (40, 350),
        (50, 347),
    ],
}


def get_elevation(route_id: str, distance_km: float) -> float | None:
    profile = ELEVATION_PROFILES.get(route_id)
    if not profile:
        return None

    for i in range(len(profile) - 1):
        km0, alt0 = profile[i]
        km1, alt1 = profile[i + 1]
        if km0 <= distance_km <= km1:
            t = (distance_km - km0) / (km1 - km0) if km1 != km0 else 0
            return round(alt0 + t * (alt1 - alt0), 0)

    return profile[-1][1]


def get_elevation_profile(route_id: str) -> list[dict]:
    profile = ELEVATION_PROFILES.get(route_id, [])
    return [{"km": km, "altitude_m": alt} for km, alt in profile]


def get_gradient(route_id: str, distance_km: float) -> float:
    profile = ELEVATION_PROFILES.get(route_id)
    if not profile:
        return 0

    for i in range(len(profile) - 1):
        km0, alt0 = profile[i]
        km1, alt1 = profile[i + 1]
        if km0 <= distance_km <= km1:
            rise = alt1 - alt0
            run = (km1 - km0) * 1000
            return round(rise / run * 1000, 1) if run > 0 else 0

    return 0
