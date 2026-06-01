import os
from contextlib import asynccontextmanager
from dataclasses import dataclass

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI

API_URL = os.getenv("API_INTERNAL_URL", "http://backend-api:8000")


@dataclass
class EngineState:
    simulated_hours: int = 0
    fator_aceleracao: float = 1.0
    dummy_value: float = 0.0


state = EngineState()
http_client: httpx.AsyncClient | None = None


async def simulation_tick() -> None:
    state.dummy_value = float(state.simulated_hours % 100)
    payload = {
        "simulated_hours": state.simulated_hours,
        "fator_aceleracao": state.fator_aceleracao,
        "dummy_value": state.dummy_value,
    }
    if http_client is not None:
        try:
            await http_client.post(f"{API_URL}/internal/tick", json=payload, timeout=2.0)
        except Exception as e:
            print(f"[engine] tick {state.simulated_hours} POST failed: {e}", flush=True)
    state.simulated_hours += 1


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient()
    scheduler = AsyncIOScheduler()
    interval = 1.0 / state.fator_aceleracao
    scheduler.add_job(simulation_tick, "interval", seconds=interval, id="simulation_tick")
    scheduler.start()
    print(f"[engine] started; tick interval {interval}s (fator={state.fator_aceleracao})", flush=True)
    try:
        yield
    finally:
        scheduler.shutdown()
        await http_client.aclose()


app = FastAPI(lifespan=lifespan)


@app.get("/")
async def health():
    return {
        "status": "ok",
        "simulated_hours": state.simulated_hours,
        "fator_aceleracao": state.fator_aceleracao,
    }
