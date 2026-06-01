import asyncio
from typing import Any


class StateCache:
    def __init__(self) -> None:
        self.last_tick: dict[str, Any] | None = None
        self._lock = asyncio.Lock()

    async def update(self, tick: dict[str, Any]) -> None:
        async with self._lock:
            self.last_tick = tick

    async def get(self) -> dict[str, Any] | None:
        async with self._lock:
            return self.last_tick


state_cache = StateCache()
