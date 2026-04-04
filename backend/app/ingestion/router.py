import json
import time
import logging
from collections import defaultdict

from fastapi import APIRouter, HTTPException

from app.models.telemetry import TelemetryPacket
from app.services.kafka_client import kafka_producer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingest", tags=["ingestion"])

PHYSICAL_BOUNDS = {
    "speed_kmh": (-1, 200),
    "water_temp_inlet": (-50, 500),
    "water_temp_outlet": (-50, 500),
    "oil_temp_inlet": (-50, 300),
    "oil_temp_outlet": (-50, 300),
    "air_temp_collector": (-50, 700),
    "fuel_temp": (-50, 150),
    "water_pressure_kpa": (-10, 2000),
    "oil_pressure_kpa": (-10, 2000),
    "air_pressure_kpa": (-10, 2000),
    "air_consumption": (0, 5000),
    "main_reservoir_pressure": (0, 15),
    "brake_line_pressure": (0, 10),
    "traction_current": (-10, 1500),
    "traction_effort": (-10, 600),
    "generator_voltage": (0, 2000),
    "generator_current": (0, 5000),
    "fuel_level": (-1, 101),
    "fuel_consumption": (0, 1000),
}

_rate_limiter: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_RPS = 10
RATE_LIMIT_WINDOW = 1.0

_last_seen: dict[str, float] = {}
DEDUP_WINDOW_MS = 100


def _check_rate_limit(loco_id: str) -> bool:
    now = time.time()
    entries = _rate_limiter[loco_id]
    _rate_limiter[loco_id] = [t for t in entries if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limiter[loco_id]) >= RATE_LIMIT_RPS:
        return False
    _rate_limiter[loco_id].append(now)
    return True


def _check_dedup(loco_id: str, ts: float) -> bool:
    key = loco_id
    last = _last_seen.get(key, 0)
    if abs(ts - last) < DEDUP_WINDOW_MS / 1000:
        return False
    _last_seen[key] = ts
    return True


def _validate_bounds(data: dict) -> dict:
    for field, (lo, hi) in PHYSICAL_BOUNDS.items():
        val = data.get(field)
        if val is not None and (val < lo or val > hi):
            data[field] = None
    return data


@router.post("/telemetry")
async def ingest_telemetry(packet: TelemetryPacket):
    if not _check_rate_limit(packet.locomotive_id):
        raise HTTPException(429, "Rate limit exceeded for this locomotive")

    ts = packet.timestamp.timestamp()
    if not _check_dedup(packet.locomotive_id, ts):
        return {"status": "duplicate", "locomotive_id": packet.locomotive_id}

    data = packet.model_dump(mode="json")
    data["timestamp"] = packet.timestamp.isoformat()
    data = _validate_bounds(data)

    await kafka_producer.send_and_wait(
        "raw-telemetry",
        key=packet.locomotive_id,
        value=data,
    )

    return {"status": "accepted", "locomotive_id": packet.locomotive_id}


@router.post("/telemetry/batch")
async def ingest_batch(packets: list[TelemetryPacket]):
    accepted = 0
    for packet in packets:
        if not _check_rate_limit(packet.locomotive_id):
            continue
        ts = packet.timestamp.timestamp()
        if not _check_dedup(packet.locomotive_id, ts):
            continue
        data = packet.model_dump(mode="json")
        data["timestamp"] = packet.timestamp.isoformat()
        data = _validate_bounds(data)
        await kafka_producer.send_and_wait(
            "raw-telemetry",
            key=packet.locomotive_id,
            value=data,
        )
        accepted += 1
    return {"status": "accepted", "count": accepted, "total": len(packets)}
