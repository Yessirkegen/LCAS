"""Simulator REST endpoints — start/stop simulator, control parameters, run scenarios."""

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter

from app.simulator.engine import LocomotiveSimulator
from app.services.kafka_client import kafka_producer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/simulator", tags=["simulator"])

_simulators: dict[str, LocomotiveSimulator] = {}
_tasks: dict[str, asyncio.Task] = {}


async def _run_simulator(sim: LocomotiveSimulator, hz: float = 1.0):
    interval = 1.0 / hz
    while True:
        packet = sim.tick(dt=interval)
        data = packet.model_dump(mode="json")
        data["timestamp"] = packet.timestamp.isoformat()
        try:
            await kafka_producer.send_and_wait(
                "raw-telemetry",
                key=packet.locomotive_id,
                value=data,
            )
        except Exception as e:
            logger.error(f"Simulator send error: {e}")
        await asyncio.sleep(interval)


@router.post("/start")
async def start_simulator(
    locomotive_id: str = "TE33A-0142",
    route: str = "loop",
    hz: float = 1.0,
    count: int = 1,
):
    started = []
    for i in range(count):
        lid = locomotive_id if count == 1 else f"TE33A-{i:04d}"
        if lid in _tasks and not _tasks[lid].done():
            continue
        sim = LocomotiveSimulator(locomotive_id=lid, route=route)
        sim.speed = 60 + (i % 40)
        _simulators[lid] = sim
        _tasks[lid] = asyncio.create_task(_run_simulator(sim, hz))
        started.append(lid)

    return {"status": "started", "locomotives": started, "hz": hz}


@router.post("/stop")
async def stop_simulator(locomotive_id: Optional[str] = None):
    stopped = []
    if locomotive_id:
        task = _tasks.pop(locomotive_id, None)
        if task:
            task.cancel()
            stopped.append(locomotive_id)
        _simulators.pop(locomotive_id, None)
    else:
        for lid, task in _tasks.items():
            task.cancel()
            stopped.append(lid)
        _tasks.clear()
        _simulators.clear()

    return {"status": "stopped", "locomotives": stopped}


@router.post("/set")
async def set_parameter(locomotive_id: str, param: str, value: float):
    sim = _simulators.get(locomotive_id)
    if not sim:
        return {"error": "Simulator not running for this locomotive"}
    if hasattr(sim, param):
        setattr(sim, param, value)
        return {"status": "ok", "param": param, "value": value}
    return {"error": f"Unknown parameter: {param}"}


@router.post("/scenario")
async def run_scenario(
    locomotive_id: str = "TE33A-0142",
    scenario: str = "overheat_water",
    duration_seconds: int = 30,
):
    sim = _simulators.get(locomotive_id)
    if not sim:
        sim = LocomotiveSimulator(locomotive_id=locomotive_id)
        _simulators[locomotive_id] = sim
        _tasks[locomotive_id] = asyncio.create_task(_run_simulator(sim, 1.0))

    async def _apply():
        steps = duration_seconds * 2
        for step in range(steps):
            progress = step / steps
            sim.apply_scenario(scenario, progress)
            await asyncio.sleep(0.5)

    asyncio.create_task(_apply())
    return {
        "status": "scenario_started",
        "scenario": scenario,
        "duration": duration_seconds,
        "locomotive_id": locomotive_id,
    }


@router.get("/status")
async def simulator_status():
    active = {
        lid: {
            "speed": sim.speed,
            "distance_km": round(sim.distance_km, 1),
            "fuel_level": round(sim.fuel_level, 1),
            "running": lid in _tasks and not _tasks[lid].done(),
        }
        for lid, sim in _simulators.items()
    }
    return {"active_simulators": len(active), "locomotives": active}
