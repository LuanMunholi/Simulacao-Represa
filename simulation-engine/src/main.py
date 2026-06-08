import asyncio
import os
from contextlib import asynccontextmanager
from typing import Any, Literal

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .rain import generate_rain_series
from .scenarios import apply_scenario, tick_scenario
from .sensors import compute_tick
from .startup import run_startup_sequence
from .state import EngineState

API_URL = os.getenv("API_INTERNAL_URL", "http://backend-api:8000")

state = EngineState()
http_client: httpx.AsyncClient | None = None
scheduler: AsyncIOScheduler | None = None


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
    # Quando pausado, o tempo não avança nem os sensores são recalculados,
    # mas o engine ainda emite "heartbeat" com o estado atual para manter o
    # cache do backend atualizado (e sobreviver a restarts do backend).
    if not state.paused:
        compute_tick(state)
        tick_scenario(state)

    payload = build_payload(state)
    if http_client is not None:
        try:
            await http_client.post(f"{API_URL}/internal/tick", json=payload, timeout=2.0)
        except Exception as e:
            print(f"[engine] tick {state.simulated_hours} POST failed: {e}", flush=True)

    if not state.paused:
        state.simulated_hours += 1


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client, scheduler
    state.rain_series = generate_rain_series()
    state.rain_series_original = list(state.rain_series)
    state.seed_chuva_window()
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


class PauseBody(BaseModel):
    reason: str  # "manual" | "previsao_critica"


@app.post("/engine/pause")
async def engine_pause(body: PauseBody) -> dict[str, Any]:
    """Pausa o loop de simulação. Idempotente — não sobrescreve paused_reason existente."""
    if not state.paused:
        state.paused = True
        state.paused_reason = body.reason
        print(f"[engine] paused (reason={body.reason})", flush=True)
    return {"ok": True, "paused_reason": state.paused_reason}


@app.post("/engine/resume")
async def engine_resume() -> dict[str, Any]:
    if state.paused:
        previous = state.paused_reason
        state.paused = False
        state.paused_reason = None
        print(f"[engine] resumed (was {previous})", flush=True)
    return {"ok": True}


class SpeedBody(BaseModel):
    fator: float = Field(ge=0.1, le=100.0)


@app.post("/engine/speed")
async def engine_speed(body: SpeedBody) -> dict[str, Any]:
    """Altera fator_aceleracao e reescalona o job do APScheduler."""
    state.fator_aceleracao = body.fator
    if scheduler is not None:
        scheduler.reschedule_job(
            "simulation_tick",
            trigger="interval",
            seconds=1.0 / body.fator,
        )
    print(f"[engine] speed -> {body.fator}x (interval={1.0/body.fator}s)", flush=True)
    return {"ok": True, "fator": body.fator}


class AdjustBody(BaseModel):
    comporta_01: float = Field(ge=0.0, le=100.0)
    comporta_02: float = Field(ge=0.0, le=100.0)
    comporta_03: float = Field(ge=0.0, le=100.0)
    comporta_04: float = Field(ge=0.0, le=100.0)
    turbina: Literal["LIGADO", "DESLIGADO"]


@app.post("/engine/adjust")
async def engine_adjust(body: AdjustBody) -> dict[str, Any]:
    """Aplica novos valores de comportas e estado da turbina ao estado."""
    if body.comporta_02 > body.comporta_03:
        raise HTTPException(
            status_code=422,
            detail="comporta_02 não pode exceder comporta_03 (restrição operacional)",
        )
    state.comporta_01 = body.comporta_01
    state.comporta_02 = body.comporta_02
    state.comporta_03 = body.comporta_03
    state.comporta_04 = body.comporta_04
    state.sensor_turbina_01 = body.turbina
    # O operador assumiu o controle: a sequência de startup (se ainda em curso)
    # para de sobrescrever as comportas a partir daqui.
    state.manual_override = True
    return {"ok": True}


class ScenarioBody(BaseModel):
    tipo: Literal["chuva_intensa", "seca"]
    duracao_dias: int


@app.post("/engine/scenario")
async def engine_scenario(body: ScenarioBody) -> dict[str, Any]:
    """Ativa cenário de chuva intensa ou seca. Sobrepõe sensor_chuva_01 enquanto ativo."""
    try:
        apply_scenario(state, body.tipo, body.duracao_dias)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    print(f"[engine] scenario started: {body.tipo} for {body.duracao_dias} days", flush=True)
    return {"ok": True, "tipo": body.tipo, "duracao_dias": body.duracao_dias}


@app.post("/engine/start")
async def engine_start() -> dict[str, Any]:
    """Dispara a sequência automática de startup em task de background."""
    if state.startup_active:
        raise HTTPException(status_code=409, detail="startup já em execução")
    asyncio.create_task(run_startup_sequence(state))
    return {"ok": True}


@app.post("/engine/reset")
async def engine_reset() -> dict[str, Any]:
    """Reinicia a simulação para uma nova partida: zera o estado (volta a pausada)
    e gera uma nova série de chuva. Usado após fim de jogo (tanque esvaziou/transbordou)."""
    state.reset()
    state.rain_series = generate_rain_series()
    state.rain_series_original = list(state.rain_series)
    state.seed_chuva_window()
    print("[engine] reset — nova partida (pausada)", flush=True)
    return {"ok": True}
