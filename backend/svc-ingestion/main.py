import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.services.kafka_client import kafka_producer, create_topics
from shared.services.redis_client import redis_client
from router import router as ingestion_router

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await redis_client.ping()
    await kafka_producer.start()
    await create_topics()
    yield
    await kafka_producer.stop()
    await redis_client.aclose()


app = FastAPI(title="Ingestion Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(ingestion_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "svc-ingestion"}
