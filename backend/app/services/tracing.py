"""Lightweight tracing — tracks latency through each pipeline stage without OpenTelemetry dependency."""

import time
import uuid
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

_recent_traces: list[dict] = []
_latency_stats: dict[str, list[float]] = defaultdict(list)
MAX_TRACES = 200
MAX_STATS = 1000


class Trace:
    def __init__(self, trace_id: str | None = None):
        self.trace_id = trace_id or uuid.uuid4().hex[:12]
        self.start = time.time()
        self.spans: list[dict] = []

    def span(self, name: str):
        elapsed = round((time.time() - self.start) * 1000, 2)
        self.spans.append({"stage": name, "elapsed_ms": elapsed, "ts": time.time()})
        _latency_stats[name].append(elapsed)
        if len(_latency_stats[name]) > MAX_STATS:
            _latency_stats[name] = _latency_stats[name][-MAX_STATS:]

    def finish(self) -> dict:
        total = round((time.time() - self.start) * 1000, 2)
        result = {
            "trace_id": self.trace_id,
            "total_ms": total,
            "spans": self.spans,
        }
        _recent_traces.append(result)
        if len(_recent_traces) > MAX_TRACES:
            _recent_traces.pop(0)
        return result


def get_recent_traces(n: int = 20) -> list[dict]:
    return list(_recent_traces[-n:])


def get_latency_percentiles() -> dict:
    result = {}
    for stage, values in _latency_stats.items():
        if not values:
            continue
        s = sorted(values)
        n = len(s)
        result[stage] = {
            "count": n,
            "p50": round(s[int(n * 0.5)], 1),
            "p95": round(s[int(n * 0.95)], 1),
            "p99": round(s[min(int(n * 0.99), n - 1)], 1),
            "avg": round(sum(s) / n, 1),
        }
    return result
