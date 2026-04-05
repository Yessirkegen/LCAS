import logging
import httpx

from shared.config import settings

logger = logging.getLogger(__name__)


async def send_telegram_alert(alert: dict):
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return

    level_emoji = {"WARNING": "🔴", "CAUTION": "🟡", "ADVISORY": "🔵"}.get(alert.get("level", ""), "⚪")

    text = (
        f"{level_emoji} *{alert.get('level', 'ALERT')}*: {alert.get('locomotive_id', '')}\n"
        f"{alert.get('message', '')}\n"
        f"HI: {alert.get('health_index', '—')}\n"
        f"Время: {alert.get('timestamp', '')}"
    )

    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
                json={
                    "chat_id": settings.telegram_chat_id,
                    "text": text,
                    "parse_mode": "Markdown",
                },
                timeout=5,
            )
    except Exception as e:
        logger.error(f"Telegram send failed: {e}")
