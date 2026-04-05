ELEVATION_PROFILES = {
    "astana_karaganda": [
        (0, 347), (20, 360), (42, 380), (65, 420), (80, 460),
        (95, 480), (120, 450), (148, 410), (170, 390), (193, 370),
        (210, 360), (230, 350),
    ],
    "almaty_shu": [
        (0, 780), (30, 700), (60, 620), (100, 550), (150, 480),
        (200, 430), (250, 400), (300, 390),
    ],
    "loop": [
        (0, 347), (10, 355), (20, 365), (30, 360), (40, 350), (50, 347),
    ],
}


def get_elevation_profile(route_id: str) -> list[dict]:
    profile = ELEVATION_PROFILES.get(route_id, [])
    return [{"km": km, "altitude_m": alt} for km, alt in profile]
