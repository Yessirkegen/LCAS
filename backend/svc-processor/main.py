import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from shared.services.database import init_db
from shared.services.redis_client import redis_client
from consumer import run_processor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_processor_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _processor_task
    await init_db()
    await redis_client.ping()
    _processor_task = asyncio.create_task(run_processor())
    logger.info("Processor service started")
    yield
    if _processor_task:
        _processor_task.cancel()
    await redis_client.aclose()


app = FastAPI(title="Processor Service", version="1.0.0", lifespan=lifespan)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "svc-processor", "task_running": _processor_task is not None and not _processor_task.done()}
