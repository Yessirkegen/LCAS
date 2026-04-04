import logging
from datetime import datetime, timezone

from sqlalchemy import text
from app.services.database import async_session

logger = logging.getLogger(__name__)

_audit_buffer: list[dict] = []


async def log_action(user: str, action: str, details: str = ""):
    entry = {
        "timestamp": datetime.now(timezone.utc),
        "user": user,
        "action": action,
        "details": details,
    }
    _audit_buffer.append(entry)
    logger.info(f"AUDIT: {user} — {action} — {details}")

    if len(_audit_buffer) >= 10:
        await flush_audit()


async def flush_audit():
    global _audit_buffer
    if not _audit_buffer:
        return
    batch = _audit_buffer[:]
    _audit_buffer = []
    try:
        async with async_session() as session:
            for entry in batch:
                await session.execute(
                    text(
                        "INSERT INTO audit_log (timestamp, username, action, details) "
                        "VALUES (:timestamp, :user, :action, :details)"
                    ),
                    entry,
                )
            await session.commit()
    except Exception as e:
        logger.error(f"Audit flush error: {e}")
