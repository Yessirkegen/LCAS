import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.services.database import engine, init_db
from app.services.redis_client import redis_client
from app.services.kafka_client import kafka_producer, create_topics

from app.ingestion.router import router as ingestion_router
from app.simulator.router import router as simulator_router
from app.api.auth import router as auth_router
from app.api.routes import router as api_router
from app.ws_hub.hub import router as ws_router


_processor_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _processor_task
    await init_db()
    await redis_client.ping()
    await kafka_producer.start()
    await create_topics()

    from app.processor.consumer import run_processor
    _processor_task = asyncio.create_task(run_processor())

    yield

    if _processor_task:
        _processor_task.cancel()
    await kafka_producer.stop()
    await redis_client.aclose()
    await engine.dispose()


app = FastAPI(
    title="Locomotive Digital Twin — LCAS",
    description="Цифровой двойник локомотива ТЭ33А с индексом здоровья и LCAS",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingestion_router)
app.include_router(simulator_router)
app.include_router(auth_router)
app.include_router(api_router)
app.include_router(ws_router)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "locomotive-digital-twin",
        "version": "0.1.0",
    }
