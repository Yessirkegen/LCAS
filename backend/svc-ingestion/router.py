import json
import time
import logging

from fastapi import APIRouter, HTTPException

from shared.models.telemetry import TelemetryPacket
from shared.services.kafka_client import kafka_producer
from shared.services.redis_client import redis_client

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

RATE_LIMIT_RPS = 10
DEDUP_WINDOW_MS = 100


async def _check_rate_limit(loco_id: str) -> bool:
    key = f"ratelimit:{loco_id}"
    count = await redis_client.incr(key)
    if count == 1:
        await redis_client.expire(key, 1)
    return count <= RATE_LIMIT_RPS


async def _check_dedup(loco_id: str, ts: float) -> bool:
    key = f"dedup:{loco_id}"
    last = await redis_client.get(key)
    if last and abs(ts - float(last)) < DEDUP_WINDOW_MS / 1000:
        return False
    await redis_client.set(key, str(ts), ex=2)
    return True


def _validate_bounds(data: dict) -> dict:
    for field, (lo, hi) in PHYSICAL_BOUNDS.items():
        val = data.get(field)
        if val is not None and (val < lo or val > hi):
            data[field] = None
    return data


@router.post("/telemetry")
async def ingest_telemetry(packet: TelemetryPacket):
    if not await _check_rate_limit(packet.locomotive_id):
        raise HTTPException(429, "Rate limit exceeded for this locomotive")

    ts = packet.timestamp.timestamp()
    if not await _check_dedup(packet.locomotive_id, ts):
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
        if not await _check_rate_limit(packet.locomotive_id):
            continue
        ts = packet.timestamp.timestamp()
        if not await _check_dedup(packet.locomotive_id, ts):
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
