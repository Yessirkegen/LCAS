"""REST API — history, config, reports, fleet list."""

import csv
import io
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import text as sql_text

from shared.services.database import async_session
from shared.services.redis_client import redis_client
from shared.services.feature_flags import get_flags, set_flag
from shared.services.webhook import register_webhook, remove_webhook
from shared.services.circuit_breaker import db_circuit_breaker
from shared.services.tracing import get_recent_traces, get_latency_percentiles
from shared.services.weather import get_weather_along_route

router = APIRouter(prefix="/api", tags=["api"])


@router.get("/locomotives")
async def list_locomotives():
    active = await redis_client.zrangebyscore("locomotives:active", "-inf", "+inf", withscores=True)
    result = []
    for loco_id, last_seen in active:
        state_raw = await redis_client.get(f"locomotive:{loco_id}:state")
        state = json.loads(state_raw) if state_raw else {}
        result.append({
            "locomotive_id": loco_id,
            "health_index": state.get("health_index"),
            "hi_letter": state.get("hi_letter"),
            "hi_category": state.get("hi_category"),
            "speed_kmh": state.get("speed_kmh"),
            "lat": state.get("lat"),
            "lon": state.get("lon"),
            "last_seen": last_seen,
        })
    result.sort(key=lambda x: x.get("health_index") or 100)
    return {"locomotives": result, "total": len(result)}


@router.get("/locomotives/{loco_id}/state")
async def get_locomotive_state(loco_id: str):
    state_raw = await redis_client.get(f"locomotive:{loco_id}:state")
    if not state_raw:
        raise HTTPException(404, "Locomotive not found or offline")
    health_raw = await redis_client.get(f"locomotive:{loco_id}:health")
    alerts_raw = await redis_client.get(f"locomotive:{loco_id}:alerts")
    return {
        "state": json.loads(state_raw),
        "health_index": json.loads(health_raw) if health_raw else None,
        "alerts": json.loads(alerts_raw) if alerts_raw else [],
    }


@router.get("/locomotives/{loco_id}/telemetry")
async def get_telemetry_history(
    loco_id: str,
    minutes: int = Query(default=5, ge=1, le=1440),
):
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    async with async_session() as session:
        result = await session.execute(
            sql_text(
                "SELECT * FROM telemetry WHERE locomotive_id = :lid AND time > :since "
                "ORDER BY time ASC LIMIT 10000"
            ),
            {"lid": loco_id, "since": since},
        )
        rows = result.mappings().all()
    return {"locomotive_id": loco_id, "count": len(rows), "data": [dict(r) for r in rows]}


@router.get("/locomotives/{loco_id}/alerts")
async def get_alerts_history(loco_id: str, limit: int = Query(default=50, le=500)):
    async with async_session() as session:
        result = await session.execute(
            sql_text(
                "SELECT * FROM alerts_history WHERE locomotive_id = :lid "
                "ORDER BY timestamp DESC LIMIT :lim"
            ),
            {"lid": loco_id, "lim": limit},
        )
        rows = result.mappings().all()
    return {"locomotive_id": loco_id, "alerts": [dict(r) for r in rows]}


@router.get("/admin/thresholds")
async def get_thresholds():
    async with async_session() as session:
        result = await session.execute(sql_text("SELECT * FROM thresholds_config ORDER BY param_id"))
        return {"thresholds": [dict(r) for r in result.mappings().all()]}


@router.put("/admin/thresholds/{param_id}")
async def update_threshold(param_id: str, data: dict):
    allowed = {"norm_min", "norm_max", "warn_min", "warn_max", "crit_min", "crit_max"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        raise HTTPException(400, "No valid fields to update")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    async with async_session() as session:
        await session.execute(
            sql_text(f"UPDATE thresholds_config SET {set_clause}, updated_at = now() WHERE param_id = :pid"),
            {**updates, "pid": param_id},
        )
        await session.commit()
    return {"status": "updated", "param_id": param_id}


@router.get("/admin/weights")
async def get_weights():
    async with async_session() as session:
        result = await session.execute(sql_text("SELECT * FROM weights_config ORDER BY param_id"))
        return {"weights": [dict(r) for r in result.mappings().all()]}


@router.put("/admin/weights/{param_id}")
async def update_weight(param_id: str, weight: float):
    async with async_session() as session:
        await session.execute(
            sql_text("UPDATE weights_config SET weight = :w, updated_at = now() WHERE param_id = :pid"),
            {"w": weight, "pid": param_id},
        )
        await session.commit()
    return {"status": "updated", "param_id": param_id, "weight": weight}


@router.get("/reports/export/{loco_id}")
async def export_report(loco_id: str, minutes: int = Query(default=15), format: str = Query(default="csv")):
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    async with async_session() as session:
        result = await session.execute(
            sql_text(
                "SELECT * FROM telemetry WHERE locomotive_id = :lid AND time > :since "
                "ORDER BY time ASC LIMIT 50000"
            ),
            {"lid": loco_id, "since": since},
        )
        rows = result.mappings().all()

    if not rows:
        raise HTTPException(404, "No data for this period")

    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        for row in rows:
            writer.writerow({k: str(v) for k, v in dict(row).items()})
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={loco_id}_report.csv"},
        )

    return {"locomotive_id": loco_id, "period_minutes": minutes, "records": len(rows), "data": [dict(r) for r in rows]}


@router.get("/admin/feature-flags")
async def get_feature_flags():
    return {"flags": await get_flags()}


@router.put("/admin/feature-flags/{flag}")
async def update_feature_flag(flag: str, enabled: bool = True):
    await set_flag(flag, enabled)
    return {"status": "updated", "flag": flag, "enabled": enabled}


@router.post("/admin/webhooks")
async def add_webhook(url: str):
    register_webhook(url)
    return {"status": "registered", "url": url}


@router.delete("/admin/webhooks")
async def del_webhook(url: str):
    remove_webhook(url)
    return {"status": "removed", "url": url}


@router.get("/admin/system-status")
async def system_status():
    active_locos = await redis_client.zcard("locomotives:active")
    redis_info = await redis_client.info("memory")
    return {
        "backend": "online",
        "database": "online" if not db_circuit_breaker.is_open else "degraded",
        "db_circuit_breaker": db_circuit_breaker.state,
        "redis": "online",
        "redis_memory_mb": round(redis_info.get("used_memory", 0) / 1024 / 1024, 1),
        "active_locomotives": active_locos,
        "feature_flags": await get_flags(),
        "latency": get_latency_percentiles(),
    }


@router.get("/admin/traces")
async def get_traces(n: int = Query(default=20, le=100)):
    return {"traces": get_recent_traces(n), "percentiles": get_latency_percentiles()}


@router.get("/locomotives/{loco_id}/incident")
async def get_incident(loco_id: str):
    raw = await redis_client.get(f"locomotive:{loco_id}:incident")
    incident = json.loads(raw) if raw else None
    return {"incident": incident}


@router.get("/locomotives/{loco_id}/events")
async def get_events(loco_id: str, last: int = Query(default=50, le=200)):
    raw = await redis_client.lrange(f"locomotive:{loco_id}:events", -last, -1)
    events = [json.loads(e) for e in raw] if raw else []
    return {"events": events}


@router.get("/locomotives/{loco_id}/consist")
async def get_loco_consist(loco_id: str):
    raw = await redis_client.get(f"locomotive:{loco_id}:consist")
    if raw:
        return json.loads(raw)
    from consist_helper import generate_consist
    consist = generate_consist(loco_id)
    await redis_client.set(f"locomotive:{loco_id}:consist", json.dumps(consist), ex=3600)
    return consist


@router.get("/locomotives/{loco_id}/schedule")
async def get_loco_schedule(loco_id: str, route: str = Query(default="astana_karaganda")):
    state_raw = await redis_client.get(f"locomotive:{loco_id}:state")
    if not state_raw:
        raise HTTPException(404, "Locomotive not found")

    state = json.loads(state_raw)
    speed = state.get("speed_kmh", 60)
    distance = state.get("distance_km", 0)

    from schedule_helper import compute_schedule_from_redis
    schedule = await compute_schedule_from_redis(route, distance, speed)
    return {"locomotive_id": loco_id, "route": route, "schedule": schedule}


@router.get("/routes/{route_id}/elevation")
async def get_route_elevation(route_id: str):
    from elevation_helper import get_elevation_profile
    profile = get_elevation_profile(route_id)
    if not profile:
        raise HTTPException(404, "Route not found")
    return {"route": route_id, "profile": profile}


@router.get("/routes/{route_id}/weather")
async def get_route_weather(route_id: str):
    raw = await redis_client.get(f"route:{route_id}:data")
    if not raw:
        raise HTTPException(404, "Route not found")
    route_data = json.loads(raw)
    weather = get_weather_along_route(route_data.get("stations", []))
    return {"route": route_id, "weather": weather}


@router.post("/annotations")
async def add_annotation(locomotive_id: str, timestamp: str, text: str, param: str = ""):
    annotation = {
        "locomotive_id": locomotive_id,
        "timestamp": timestamp,
        "text": text,
        "param": param,
        "created_by": "dispatcher",
    }
    await redis_client.rpush(f"annotations:{locomotive_id}", json.dumps(annotation))
    return {"status": "created", "annotation": annotation}


@router.get("/annotations")
async def get_annotations(locomotive_id: str = ""):
    if locomotive_id:
        raw = await redis_client.lrange(f"annotations:{locomotive_id}", 0, -1)
        annotations = [json.loads(a) for a in raw]
    else:
        keys = await redis_client.keys("annotations:*")
        annotations = []
        for key in keys:
            raw = await redis_client.lrange(key, 0, -1)
            annotations.extend([json.loads(a) for a in raw])
    return {"annotations": annotations}
