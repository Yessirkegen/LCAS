import random

CARGO_TYPES = ["зерно", "уголь", "нефтепродукты", "контейнер", "порожний", "щебень", "металл", "лес"]


def generate_consist(loco_id: str, wagon_count: int | None = None) -> dict:
    if wagon_count is None:
        wagon_count = random.randint(20, 60)
    wagons = []
    total_weight = 0
    for i in range(wagon_count):
        cargo = random.choice(CARGO_TYPES)
        weight = 0 if cargo == "порожний" else random.randint(40, 68)
        wagons.append({"index": i + 1, "cargo": cargo, "weight_tons": weight})
        total_weight += weight

    return {
        "locomotive_id": loco_id,
        "wagon_count": wagon_count,
        "total_weight_tons": total_weight,
        "wagons": wagons,
    }
