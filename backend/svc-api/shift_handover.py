import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query
from sqlalchemy import text

from shared.services.database import async_session
from shared.services.redis_client import redis_client

router = APIRouter(prefix="/api", tags=["shift"])


@router.get("/locomotives/{loco_id}/shift-report")
async def generate_shift_report(loco_id: str, hours: int = Query(default=12, ge=1, le=24)):
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    state_raw = await redis_client.get(f"locomotive:{loco_id}:state")
    current_state = json.loads(state_raw) if state_raw else {}

    async with async_session() as session:
        telemetry = await session.execute(
            text("SELECT count(*) as cnt, avg(speed_kmh) as avg_speed, "
                 "avg(health_index) as avg_hi, min(health_index) as min_hi, "
                 "avg(fuel_consumption) as avg_fuel "
                 "FROM telemetry WHERE locomotive_id = :lid AND time > :since"),
            {"lid": loco_id, "since": since},
        )
        row = telemetry.mappings().first()

        alerts_result = await session.execute(
            text("SELECT count(*) as alert_cnt FROM alerts_history WHERE locomotive_id = :lid AND timestamp > :since"),
            {"lid": loco_id, "since": since},
        )
        alert_row = alerts_result.mappings().first()

    avg_speed = round(row["avg_speed"] or 0, 1) if row else 0
    avg_hi = round(row["avg_hi"] or 0, 1) if row else 0
    min_hi = round(row["min_hi"] or 0, 1) if row else 0
    avg_fuel = round(row["avg_fuel"] or 0, 1) if row else 0
    record_count = row["cnt"] if row else 0
    distance_km = round(avg_speed * hours, 0)

    return {
        "locomotive_id": loco_id,
        "period_hours": hours,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "records": record_count,
            "distance_km": distance_km,
            "avg_speed_kmh": avg_speed,
            "avg_health_index": avg_hi,
            "min_health_index": min_hi,
            "avg_fuel_consumption": avg_fuel,
            "incidents": alert_row["alert_cnt"] if alert_row else 0,
        },
        "current_state": {
            "health_index": current_state.get("health_index"),
            "speed_kmh": current_state.get("speed_kmh"),
            "fuel_level": current_state.get("fuel_level"),
        },
        "notes": "Автоматический отчёт за смену. Проверьте активные алерты перед началом работы.",
    }
