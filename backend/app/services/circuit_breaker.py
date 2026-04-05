"""Circuit breaker — if DB fails, processor keeps working via Redis only."""

import time
import logging

logger = logging.getLogger(__name__)


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, reset_timeout: float = 60):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.failures = 0
        self.state = "closed"  # closed (normal) / open (failing) / half-open (testing)
        self.last_failure_time = 0

    def record_success(self):
        self.failures = 0
        if self.state != "closed":
            logger.info("Circuit breaker: CLOSED (recovered)")
        self.state = "closed"

    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.failure_threshold:
            if self.state != "open":
                logger.warning(f"Circuit breaker: OPEN (after {self.failures} failures)")
            self.state = "open"

    def can_execute(self) -> bool:
        if self.state == "closed":
            return True
        if self.state == "open":
            if time.time() - self.last_failure_time > self.reset_timeout:
                self.state = "half-open"
                logger.info("Circuit breaker: HALF-OPEN (testing)")
                return True
            return False
        return True  # half-open

    @property
    def is_open(self) -> bool:
        return self.state == "open"


db_circuit_breaker = CircuitBreaker(failure_threshold=3, reset_timeout=30)
