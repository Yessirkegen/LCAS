import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.services.kafka_client import kafka_producer, create_topics
from shared.services.redis_client import redis_client
from router import router as sim_router
from routes_osm import ROUTES_KZ

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await redis_client.ping()
    await kafka_producer.start()
    await create_topics()

    for route_id, route_data in ROUTES_KZ.items():
        await redis_client.set(
            f"route:{route_id}:data",
            json.dumps({
                "name": route_data["name"],
                "total_km": route_data["total_km"],
                "stations": route_data.get("stations", []),
                "points": route_data["points"][:20],
            }),
            ex=86400,
        )
    logger.info(f"Published {len(ROUTES_KZ)} routes to Redis")

    yield
    await kafka_producer.stop()
    await redis_client.aclose()


app = FastAPI(title="Simulator Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(sim_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "svc-simulator"}
