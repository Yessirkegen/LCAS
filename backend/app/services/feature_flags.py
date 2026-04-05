"""Feature flags — toggle features without redeployment. Stored in Redis."""

import json
import logging
from app.services.redis_client import redis_client

logger = logging.getLogger(__name__)

DEFAULTS = {
    "predictive_hi": True,
    "voice_alerts": True,
    "telegram_notifications": False,
    "anomaly_detection": True,
    "fuel_efficiency": True,
    "webhook_enabled": False,
}

REDIS_KEY = "feature_flags"


async def get_flags() -> dict:
    raw = await redis_client.get(REDIS_KEY)
    if raw:
        stored = json.loads(raw)
        return {**DEFAULTS, **stored}
    return dict(DEFAULTS)


async def set_flag(flag: str, value: bool):
    flags = await get_flags()
    flags[flag] = value
    await redis_client.set(REDIS_KEY, json.dumps(flags))
    logger.info(f"Feature flag updated: {flag} = {value}")


async def is_enabled(flag: str) -> bool:
    flags = await get_flags()
    return flags.get(flag, False)
