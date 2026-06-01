import asyncio
from typing import Any


class StateCache:
    def __init__(self) -> None:
        self.last_tick: dict[str, Any] | None = None
        # Conjunto de alertas ativos no último ciclo do display_tick.
        # Usados para detectar transições (somente novos alertas são persistidos).
        self.previous_risk_codes: set[str] = set()
        self.previous_prediction_keys: set[tuple[str, str, str]] = set()
        self._lock = asyncio.Lock()

    async def update(self, tick: dict[str, Any]) -> None:
        async with self._lock:
            self.last_tick = tick

    async def get(self) -> dict[str, Any] | None:
        async with self._lock:
            return self.last_tick


state_cache = StateCache()
