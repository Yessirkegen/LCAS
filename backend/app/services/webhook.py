"""Webhook — POST alerts to external URLs."""

import logging
import httpx

logger = logging.getLogger(__name__)

_webhook_urls: list[str] = []


def register_webhook(url: str):
    if url not in _webhook_urls:
        _webhook_urls.append(url)


def remove_webhook(url: str):
    _webhook_urls[:] = [u for u in _webhook_urls if u != url]


async def fire_webhook(event: str, data: dict):
    if not _webhook_urls:
        return
    payload = {"event": event, **data}
    async with httpx.AsyncClient(timeout=5) as client:
        for url in _webhook_urls:
            try:
                await client.post(url, json=payload)
            except Exception as e:
                logger.error(f"Webhook failed for {url}: {e}")
