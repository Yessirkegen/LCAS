"""REST API — history, config, reports, fleet list."""

import csv
import io
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import text

from app.services.database import async_session
from app.services.redis_client import redis_client

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
            text(
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
            text(
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
        result = await session.execute(text("SELECT * FROM thresholds_config ORDER BY param_id"))
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
            text(f"UPDATE thresholds_config SET {set_clause}, updated_at = now() WHERE param_id = :pid"),
            {**updates, "pid": param_id},
        )
        await session.commit()
    return {"status": "updated", "param_id": param_id}


@router.get("/admin/weights")
async def get_weights():
    async with async_session() as session:
        result = await session.execute(text("SELECT * FROM weights_config ORDER BY param_id"))
        return {"weights": [dict(r) for r in result.mappings().all()]}


@router.put("/admin/weights/{param_id}")
async def update_weight(param_id: str, weight: float):
    async with async_session() as session:
        await session.execute(
            text("UPDATE weights_config SET weight = :w, updated_at = now() WHERE param_id = :pid"),
            {"w": weight, "pid": param_id},
        )
        await session.commit()
    return {"status": "updated", "param_id": param_id, "weight": weight}


@router.get("/reports/export/{loco_id}")
async def export_report(loco_id: str, minutes: int = Query(default=15), format: str = Query(default="csv")):
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    async with async_session() as session:
        result = await session.execute(
            text(
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
