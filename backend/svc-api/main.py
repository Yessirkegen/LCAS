import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.services.database import init_db
from shared.services.redis_client import redis_client
from routes import router as api_router
from auth_routes import router as auth_router
from shift_handover import router as shift_router

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await redis_client.ping()
    yield
    await redis_client.aclose()


app = FastAPI(title="API Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth_router)
app.include_router(api_router)
app.include_router(shift_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "svc-api"}
