import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from shared.services.redis_client import redis_client
from hub import router as ws_router

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await redis_client.ping()
    yield
    await redis_client.aclose()


app = FastAPI(title="WebSocket Gateway", version="1.0.0", lifespan=lifespan)
app.include_router(ws_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "svc-ws-gateway"}
