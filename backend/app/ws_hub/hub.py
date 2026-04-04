"""WebSocket Hub — delivers real-time telemetry to clients via Redis pub/sub."""

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.services.redis_client import redis_client
from app.api.auth import decode_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    ws: WebSocket,
    token: str = Query(default=""),
    loco_id: str = Query(default=""),
):
    try:
        payload = decode_token(token)
    except Exception:
        await ws.close(code=4001, reason="Invalid token")
        return

    role = payload.get("role", "driver")
    await ws.accept()
    logger.info(f"WS connected: user={payload.get('sub')}, role={role}, loco_id={loco_id}")

    pubsub = redis_client.pubsub()

    try:
        if role == "driver" and loco_id:
            await pubsub.subscribe(f"channel:loco:{loco_id}")
        elif role in ("dispatcher", "admin", "simulator"):
            await pubsub.subscribe("channel:fleet")
            if loco_id:
                await pubsub.subscribe(f"channel:loco:{loco_id}")
        else:
            await pubsub.subscribe("channel:fleet")

        async def reader():
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        await ws.send_text(message["data"])
                    except Exception:
                        break

        reader_task = asyncio.create_task(reader())

        while True:
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=30)
                msg = json.loads(data)

                if msg.get("action") == "subscribe" and msg.get("loco_id"):
                    new_loco = msg["loco_id"]
                    await pubsub.subscribe(f"channel:loco:{new_loco}")
                    logger.info(f"WS subscribed to loco {new_loco}")

                elif msg.get("action") == "unsubscribe" and msg.get("loco_id"):
                    old_loco = msg["loco_id"]
                    await pubsub.unsubscribe(f"channel:loco:{old_loco}")

                elif msg.get("action") == "acknowledge_alert":
                    alert_key = msg.get("alert_key", "")
                    logger.info(f"Alert acknowledged: {alert_key} by {payload.get('sub')}")

            except asyncio.TimeoutError:
                try:
                    await ws.send_text(json.dumps({"type": "ping"}))
                except Exception:
                    break

    except WebSocketDisconnect:
        logger.info(f"WS disconnected: user={payload.get('sub')}")
    except Exception as e:
        logger.error(f"WS error: {e}")
    finally:
        await pubsub.unsubscribe()
        await pubsub.aclose()
