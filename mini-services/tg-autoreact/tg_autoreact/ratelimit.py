"""Ограничители частоты запросов для одного аккаунта."""

from __future__ import annotations

import asyncio
import time
from collections import deque


class RateLimiter:
    """Скользящее окно на минуту + минимальный интервал между действиями.

    Дополнительно умеет вставать на паузу целиком — это нужно для FloodWait,
    когда Telegram явно просит подождать N секунд.
    """

    def __init__(self, per_minute: float, min_interval: float) -> None:
        self._per_minute = per_minute
        self._min_interval = min_interval
        self._hits: deque[float] = deque()
        self._last_hit = 0.0
        self._paused_until = 0.0
        self._lock = asyncio.Lock()

    @property
    def paused_for(self) -> float:
        return max(0.0, self._paused_until - time.monotonic())

    def pause(self, seconds: float) -> None:
        """Заморозить выдачу разрешений минимум на `seconds`."""
        self._paused_until = max(self._paused_until, time.monotonic() + seconds)

    async def acquire(self) -> None:
        """Дождаться момента, когда очередное действие вписывается в лимиты."""
        async with self._lock:
            while True:
                now = time.monotonic()

                if now < self._paused_until:
                    await asyncio.sleep(self._paused_until - now)
                    continue

                while self._hits and now - self._hits[0] >= 60.0:
                    self._hits.popleft()

                wait = 0.0
                if self._min_interval > 0:
                    wait = max(wait, self._last_hit + self._min_interval - now)
                if self._per_minute > 0 and len(self._hits) >= self._per_minute:
                    wait = max(wait, 60.0 - (now - self._hits[0]))

                if wait > 0:
                    await asyncio.sleep(wait)
                    continue

                self._last_hit = now
                self._hits.append(now)
                return


class ChatCooldown:
    """Минимальная пауза между реакциями внутри одного чата."""

    def __init__(self, seconds: float) -> None:
        self._seconds = seconds
        self._last: dict[int, float] = {}

    def allowed(self, chat_id: int) -> bool:
        if self._seconds <= 0:
            return True
        last = self._last.get(chat_id)
        return last is None or (time.monotonic() - last) >= self._seconds

    def mark(self, chat_id: int) -> None:
        if self._seconds > 0:
            self._last[chat_id] = time.monotonic()
            if len(self._last) > 10_000:
                cutoff = time.monotonic() - self._seconds
                self._last = {k: v for k, v in self._last.items() if v > cutoff}
