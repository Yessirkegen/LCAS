"""Kafka consumer — processes raw telemetry, computes HI, detects alerts, publishes to Redis."""

import asyncio
import json
import logging
import time
from collections import defaultdict
from datetime import datetime, timezone

from aiokafka import AIOKafkaConsumer

from shared.config import settings
from shared.services.redis_client import redis_client
from shared.services.database import async_session
from shared.services.circuit_breaker import db_circuit_breaker
from shared.services.tracing import Trace
from health_index import compute_health_index
from alerts import detect_alerts
from edge_cases import detect_stuck_sensors, detect_cold_start, check_warning_escalation
from anomaly import detect_anomalies
from fuel_efficiency import update_fuel_data, compute_fuel_efficiency
from data_quality import compute_data_quality
from incident_timeline import log_event, start_incident, get_active_incident, get_event_log

logger = logging.getLogger(__name__)

_thresholds: dict[str, dict] = {}
_weights: dict[str, float] = {}
_penalties: dict[str, float] = {}
_active_alerts: dict[str, dict] = {}
_ema_state: dict[str, dict] = defaultdict(dict)
_hi_history: dict[str, list] = defaultdict(list)
_config_loaded = False
_write_buffer: list[dict] = []
_last_flush = time.time()

EMA_ALPHA = 0.3
FLUSH_INTERVAL = 2.0
FLUSH_BATCH_SIZE = 100
HI_HISTORY_WINDOW = 300


async def _load_config():
    global _thresholds, _weights, _penalties, _config_loaded
    from sqlalchemy import text
    async with async_session() as session:
        rows = (await session.execute(text("SELECT * FROM thresholds_config"))).mappings().all()
        _thresholds = {r["param_id"]: dict(r) for r in rows}

        rows = (await session.execute(text("SELECT * FROM weights_config"))).mappings().all()
        _weights = {r["param_id"]: r["weight"] for r in rows}

        rows = (await session.execute(text("SELECT * FROM penalties_config"))).mappings().all()
        _penalties = {r["event_id"]: r["penalty"] for r in rows}

    _config_loaded = True
    logger.info(f"Config loaded: {len(_thresholds)} thresholds, {len(_weights)} weights, {len(_penalties)} penalties")


def _apply_ema(loco_id: str, data: dict) -> dict:
    smoothed = dict(data)
    skip_fields = {"ground_fault_power", "ground_fault_aux", "wheel_slip", "compressor_active",
                   "locomotive_id", "timestamp", "lat", "lon"}

    for key, value in data.items():
        if key in skip_fields or value is None or not isinstance(value, (int, float)):
            continue
        prev = _ema_state[loco_id].get(key)
        if prev is not None:
            smoothed[key] = EMA_ALPHA * value + (1 - EMA_ALPHA) * prev
        _ema_state[loco_id][key] = smoothed[key]

    return smoothed


def _predict_hi(loco_id: str, current_hi: float) -> float | None:
    history = _hi_history[loco_id]
    history.append((time.time(), current_hi))
    cutoff = time.time() - HI_HISTORY_WINDOW
    _hi_history[loco_id] = [(t, v) for t, v in history if t > cutoff]

    h = _hi_history[loco_id]
    if len(h) < 10:
        return None

    t0, v0 = h[0]
    t1, v1 = h[-1]
    dt = t1 - t0
    if dt <= 0:
        return None

    slope = (v1 - v0) / dt
    if slope >= 0:
        return None

    seconds_to_50 = (50 - v1) / slope
    if 0 < seconds_to_50 < 900:
        return round(seconds_to_50 / 60, 1)
    return None


async def _publish_to_redis(loco_id: str, data: dict, hi_result: dict, alerts: list):
    pipe = redis_client.pipeline()

    state_data = {
        **{k: v for k, v in data.items() if v is not None},
        "health_index": hi_result["value"],
        "hi_letter": hi_result["letter"],
        "hi_category": hi_result["category"],
    }
    pipe.set(f"locomotive:{loco_id}:state", json.dumps(state_data, default=str), ex=30)
    pipe.set(f"locomotive:{loco_id}:health", json.dumps(hi_result, default=str), ex=30)

    if alerts:
        pipe.set(f"locomotive:{loco_id}:alerts", json.dumps(alerts, default=str), ex=60)

    pipe.zadd("locomotives:active", {loco_id: time.time()})

    publish_data = {
        "type": "telemetry",
        "locomotive_id": loco_id,
        "data": state_data,
        "health_index": hi_result,
        "alerts": alerts,
    }
    pipe.publish(f"channel:loco:{loco_id}", json.dumps(publish_data, default=str))
    pipe.publish("channel:fleet", json.dumps({
        "type": "fleet_update",
        "locomotive_id": loco_id,
        "health_index": hi_result["value"],
        "hi_letter": hi_result["letter"],
        "hi_category": hi_result["category"],
        "speed": data.get("speed_kmh"),
        "lat": data.get("lat"),
        "lon": data.get("lon"),
        "alert_count": len(alerts),
    }, default=str))

    await pipe.execute()


async def _flush_to_db():
    global _write_buffer, _last_flush
    if not _write_buffer:
        return

    batch = _write_buffer[:FLUSH_BATCH_SIZE]
    _write_buffer = _write_buffer[FLUSH_BATCH_SIZE:]
    _last_flush = time.time()

    from sqlalchemy import text
    async with async_session() as session:
        for row in batch:
            cols = [k for k in row if row[k] is not None]
            placeholders = ", ".join(f":{c}" for c in cols)
            col_names = ", ".join(cols)
            await session.execute(
                text(f"INSERT INTO telemetry ({col_names}) VALUES ({placeholders})"),
                {c: row[c] for c in cols},
            )
        await session.commit()


async def _db_flusher():
    while True:
        await asyncio.sleep(FLUSH_INTERVAL)
        if not db_circuit_breaker.can_execute():
            logger.warning("Circuit breaker OPEN — skipping DB write")
            continue
        try:
            await _flush_to_db()
            db_circuit_breaker.record_success()
        except Exception as e:
            db_circuit_breaker.record_failure()
            logger.error(f"DB flush error (circuit breaker: {db_circuit_breaker.state}): {e}")


async def run_processor():
    if not _config_loaded:
        await _load_config()

    consumer = AIOKafkaConsumer(
        "raw-telemetry",
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id="processor-group",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        auto_offset_reset="latest",
    )
    await consumer.start()
    logger.info("Processor consumer started")

    flush_task = asyncio.create_task(_db_flusher())

    try:
        async for msg in consumer:
          try:
            data = msg.value
            loco_id = data.get("locomotive_id", "unknown")
            trace = Trace()
            trace.span("kafka_received")

            smoothed = _apply_ema(loco_id, data)
            trace.span("ema_applied")

            hi_result = compute_health_index(smoothed, _thresholds, _weights, _penalties)

            predicted = _predict_hi(loco_id, hi_result["value"])
            if predicted is not None:
                hi_result["predicted_minutes_to_critical"] = predicted

            new_alerts, resolved_keys = detect_alerts(smoothed, _thresholds, _active_alerts)

            for alert in new_alerts:
                key = f"{loco_id}:{alert['param']}"
                _active_alerts[key] = alert
                if alert["level"] == "WARNING":
                    try:
                        from shared.services.telegram import send_telegram_alert
                        alert_with_hi = {**alert, "health_index": hi_result["value"]}
                        asyncio.create_task(send_telegram_alert(alert_with_hi))
                    except Exception:
                        pass

            for key in resolved_keys:
                _active_alerts.pop(key, None)

            stuck = detect_stuck_sensors(loco_id, smoothed)
            for param in stuck:
                stuck_key = f"{loco_id}:stuck_{param}"
                if stuck_key not in _active_alerts:
                    _param_ru = {
                        "main_reservoir_pressure": "давления ГР",
                        "brake_line_pressure": "тормозной магистрали",
                        "fuel_level": "уровня топлива",
                        "water_temp_inlet": "температуры воды (вход)",
                        "water_temp_outlet": "температуры воды (выход)",
                        "oil_temp_inlet": "температуры масла (вход)",
                        "oil_temp_outlet": "температуры масла (выход)",
                        "oil_pressure_kpa": "давления масла",
                        "water_pressure_kpa": "давления воды",
                        "traction_current": "тока тяги",
                        "speed_kmh": "скорости",
                    }.get(param, param.replace("_", " "))
                    _active_alerts[stuck_key] = {
                        "id": f"stuck-{param[:8]}",
                        "locomotive_id": loco_id,
                        "timestamp": data.get("timestamp", datetime.now(timezone.utc).isoformat()),
                        "level": "CAUTION",
                        "param": f"stuck_{param}",
                        "message": f"Датчик {_param_ru} — нет изменений",
                        "voice_text": f"ВНИМАНИЕ. ДАТЧИК {_param_ru.upper()} НЕТ ИЗМЕНЕНИЙ",
                        "status": "active",
                    }

            has_unacked = any(
                a["level"] == "WARNING" and a["status"] == "active"
                for a in _active_alerts.values()
                if a.get("locomotive_id") == loco_id
            )
            check_warning_escalation(loco_id, has_unacked)

            current_alerts = [
                a for k, a in _active_alerts.items()
                if k.startswith(f"{loco_id}:")
            ]

            anomalies = detect_anomalies(loco_id, smoothed)
            for anom in anomalies:
                anom_key = f"{loco_id}:anomaly_{anom['param']}"
                if anom_key not in _active_alerts:
                    _active_alerts[anom_key] = {
                        "id": f"anom-{anom['param'][:6]}",
                        "locomotive_id": loco_id,
                        "timestamp": data.get("timestamp", datetime.now(timezone.utc).isoformat()),
                        "level": "CAUTION",
                        "param": f"anomaly_{anom['param']}",
                        "message": anom["message"],
                        "voice_text": f"АНОМАЛИЯ. {anom['param'].upper().replace('_',' ')}",
                        "status": "active",
                    }

            update_fuel_data(loco_id, smoothed.get("speed_kmh"), smoothed.get("fuel_consumption"))
            fuel_eff = compute_fuel_efficiency(loco_id, smoothed.get("speed_kmh"), smoothed.get("fuel_consumption"))
            if fuel_eff:
                hi_result["fuel_efficiency"] = fuel_eff

            dq = compute_data_quality(loco_id, smoothed)
            hi_result["data_quality"] = dq.get("_overall", 100)

            log_event(loco_id, "telemetry", f"HI={hi_result['value']}", {"speed": smoothed.get("speed_kmh")})
            for alert in new_alerts:
                log_event(loco_id, "alert", alert.get("message", ""), {"level": alert["level"]})
                if alert["level"] == "WARNING" and not get_active_incident(loco_id):
                    start_incident(loco_id, alert)

            incident = get_active_incident(loco_id)
            if incident:
                await redis_client.set(
                    f"locomotive:{loco_id}:incident",
                    json.dumps(incident, default=str),
                    ex=300,
                )

            events = get_event_log(loco_id, 50)
            if events:
                pipe_ev = redis_client.pipeline()
                key = f"locomotive:{loco_id}:events"
                pipe_ev.delete(key)
                for ev in events[-50:]:
                    pipe_ev.rpush(key, json.dumps(ev, default=str))
                pipe_ev.expire(key, 300)
                await pipe_ev.execute()

            current_alerts = [
                a for k, a in _active_alerts.items()
                if k.startswith(f"{loco_id}:")
            ]

            trace.span("processing_done")
            await _publish_to_redis(loco_id, smoothed, hi_result, current_alerts)
            trace.span("redis_published")
            trace.finish()

            ts_raw = data.get("timestamp")
            if isinstance(ts_raw, str):
                from dateutil.parser import isoparse
                ts_parsed = isoparse(ts_raw)
            else:
                ts_parsed = datetime.now(timezone.utc)

            db_row = {
                "time": ts_parsed,
                "locomotive_id": loco_id,
                "lat": smoothed.get("lat"),
                "lon": smoothed.get("lon"),
                "speed_kmh": smoothed.get("speed_kmh"),
                "wheel_slip": smoothed.get("wheel_slip"),
                "water_temp_inlet": smoothed.get("water_temp_inlet"),
                "water_temp_outlet": smoothed.get("water_temp_outlet"),
                "oil_temp_inlet": smoothed.get("oil_temp_inlet"),
                "oil_temp_outlet": smoothed.get("oil_temp_outlet"),
                "water_pressure_kpa": smoothed.get("water_pressure_kpa"),
                "oil_pressure_kpa": smoothed.get("oil_pressure_kpa"),
                "main_reservoir_pressure": smoothed.get("main_reservoir_pressure"),
                "brake_line_pressure": smoothed.get("brake_line_pressure"),
                "traction_current": smoothed.get("traction_current"),
                "fuel_level": smoothed.get("fuel_level"),
                "fuel_consumption": smoothed.get("fuel_consumption"),
                "health_index": hi_result["value"],
            }
            _write_buffer.append(db_row)

          except Exception as e:
            logger.error(f"Processing error for {data.get('locomotive_id','?')}: {e}", exc_info=True)

    finally:
        flush_task.cancel()
        await consumer.stop()
