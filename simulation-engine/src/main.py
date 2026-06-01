import os
from contextlib import asynccontextmanager
from typing import Any

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI

from .rain import generate_rain_series
from .sensors import compute_tick
from .state import EngineState

API_URL = os.getenv("API_INTERNAL_URL", "http://backend-api:8000")

state = EngineState()
http_client: httpx.AsyncClient | None = None


SENSOR_UNITS: dict[str, str | None] = {
    "sensor_chuva_01": "mm/h",
    "sensor_chuva_02": "mm",
    "sensor_comporta_01": "%",
    "sensor_enchimento_01": "m³/h",
    "sensor_comporta_02": "%",
    "sensor_fluxo_01": "m³/h",
    "sensor_comporta_03": "%",
    "sensor_fluxo_02": "m³/h",
    "sensor_comporta_04": "%",
    "sensor_esvaziamento_01": "m³/h",
    "sensor_turbina_01": None,
    "sensor_energia_01": "kW/h",
    "sensor_volume_01": "%",
    "sensor_volume_02": "%",
}


def build_payload(s: EngineState) -> dict[str, Any]:
    sensor_values: dict[str, float | str] = {
        "sensor_chuva_01": s.sensor_chuva_01,
        "sensor_chuva_02": s.sensor_chuva_02,
        "sensor_comporta_01": s.comporta_01,
        "sensor_enchimento_01": s.sensor_enchimento_01,
        "sensor_comporta_02": s.comporta_02,
        "sensor_fluxo_01": s.sensor_fluxo_01,
        "sensor_comporta_03": s.comporta_03,
        "sensor_fluxo_02": s.sensor_fluxo_02,
        "sensor_comporta_04": s.comporta_04,
        "sensor_esvaziamento_01": s.sensor_esvaziamento_01,
        "sensor_turbina_01": s.sensor_turbina_01,
        "sensor_energia_01": s.sensor_energia_01,
        "sensor_volume_01": s.sensor_volume_01,
        "sensor_volume_02": s.sensor_volume_02,
    }
    return {
        "simulated_hours": s.simulated_hours,
        "fator_aceleracao": s.fator_aceleracao,
        "status": s.status(),
        "paused_reason": s.paused_reason,
        "scenario_active": s.scenario_active,
        "scenario_ticks_remaining": s.scenario_ticks_remaining,
        "sensors": {
            sid: {"valor": val, "unidade": SENSOR_UNITS[sid]}
            for sid, val in sensor_values.items()
        },
        "derived": {
            "capacidade_atual": s.capacidade_atual,
            "contribuicao_chuva": s.contribuicao_chuva,
            "taxa_liquida_01": s.taxa_liquida_01,
            "taxa_liquida_02": s.taxa_liquida_02,
        },
    }


async def simulation_tick() -> None:
    if state.paused:
        return
    compute_tick(state)
    payload = build_payload(state)
    if http_client is not None:
        try:
            await http_client.post(f"{API_URL}/internal/tick", json=payload, timeout=2.0)
        except Exception as e:
            print(f"[engine] tick {state.simulated_hours} POST failed: {e}", flush=True)
    state.simulated_hours += 1


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    state.rain_series = generate_rain_series()
    state.rain_series_original = list(state.rain_series)
    http_client = httpx.AsyncClient()
    scheduler = AsyncIOScheduler()
    interval = 1.0 / state.fator_aceleracao
    scheduler.add_job(simulation_tick, "interval", seconds=interval, id="simulation_tick")
    scheduler.start()
    print(
        f"[engine] started; tick={interval}s fator={state.fator_aceleracao}; "
        f"rain_series gerada com {len(state.rain_series)} dias",
        flush=True,
    )
    try:
        yield
    finally:
        scheduler.shutdown()
        await http_client.aclose()


app = FastAPI(lifespan=lifespan)


@app.get("/")
async def health() -> dict[str, Any]:
    return {
        "status": state.status(),
        "simulated_hours": state.simulated_hours,
        "fator_aceleracao": state.fator_aceleracao,
        "paused": state.paused,
        "paused_reason": state.paused_reason,
    }
