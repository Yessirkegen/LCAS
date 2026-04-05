import redis.asyncio as aioredis

from shared.config import settings

redis_client = aioredis.from_url(
    settings.redis_url,
    decode_responses=True,
    max_connections=50,
)
