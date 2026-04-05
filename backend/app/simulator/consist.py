"""Train consist — wagons attached to locomotive."""

import random

CARGO_TYPES = ["зерно", "уголь", "нефтепродукты", "контейнер", "порожний", "щебень", "металл", "лес"]


def generate_consist(loco_id: str, wagon_count: int = 50) -> dict:
    wagons = []
    total_weight = 0
    for i in range(wagon_count):
        cargo = random.choice(CARGO_TYPES)
        weight = 0 if cargo == "порожний" else random.randint(40, 68)
        wagons.append({
            "index": i + 1,
            "cargo": cargo,
            "weight_tons": weight,
        })
        total_weight += weight

    return {
        "locomotive_id": loco_id,
        "wagon_count": wagon_count,
        "total_weight_tons": total_weight,
        "wagons": wagons,
    }


DEFAULT_CONSISTS = {
    "TE33A-0142": generate_consist("TE33A-0142", 45),
}


def get_consist(loco_id: str) -> dict:
    if loco_id not in DEFAULT_CONSISTS:
        DEFAULT_CONSISTS[loco_id] = generate_consist(loco_id, random.randint(20, 60))
    return DEFAULT_CONSISTS[loco_id]
