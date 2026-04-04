import json
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.database_url, echo=False, pool_size=20, max_overflow=10)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    from app.models.db_models import (
        Telemetry, AlertHistory, HealthIndexHistory,
        ThresholdConfig, WeightConfig, PenaltyConfig, User,
    )
    from app.models.seed import THRESHOLDS, WEIGHTS, PENALTIES, get_users_with_hashed_passwords

    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE"))
        await conn.run_sync(Base.metadata.create_all)

        try:
            await conn.execute(text(
                "SELECT create_hypertable('telemetry', 'time', if_not_exists => TRUE, migrate_data => TRUE)"
            ))
            await conn.execute(text(
                "SELECT create_hypertable('health_index_history', 'time', if_not_exists => TRUE, migrate_data => TRUE)"
            ))
        except Exception as e:
            logger.info(f"Hypertables already exist or skipped: {e}")

    async with async_session() as session:
        existing = (await session.execute(text("SELECT count(*) FROM thresholds_config"))).scalar()
        if existing == 0:
            logger.info("Seeding thresholds, weights, penalties, users...")
            for t in THRESHOLDS:
                await session.execute(text(
                    "INSERT INTO thresholds_config (param_id, unit, norm_min, norm_max, warn_min, warn_max, crit_min, crit_max) "
                    "VALUES (:param_id, :unit, :norm_min, :norm_max, :warn_min, :warn_max, :crit_min, :crit_max) "
                    "ON CONFLICT (param_id) DO NOTHING"
                ), t)
            for w in WEIGHTS:
                await session.execute(text(
                    "INSERT INTO weights_config (param_id, weight) VALUES (:param_id, :weight) "
                    "ON CONFLICT (param_id) DO NOTHING"
                ), w)
            for p in PENALTIES:
                await session.execute(text(
                    "INSERT INTO penalties_config (event_id, penalty) VALUES (:event_id, :penalty) "
                    "ON CONFLICT (event_id) DO NOTHING"
                ), p)
            for u in get_users_with_hashed_passwords():
                await session.execute(text(
                    "INSERT INTO users (username, password_hash, role) VALUES (:username, :password_hash, :role) "
                    "ON CONFLICT (username) DO NOTHING"
                ), u)
            await session.commit()
            logger.info("Seed data inserted.")
        else:
            logger.info("Seed data already exists, skipping.")


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
