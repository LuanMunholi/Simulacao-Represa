import os
from typing import Any, Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..adjustment import compute_adjustment
from ..state_cache import state_cache

router = APIRouter(prefix="/simulation", tags=["simulation"])

ENGINE_URL = os.getenv("ENGINE_INTERNAL_URL", "http://simulation-engine:8001")


@router.post("/pause")
async def simulation_pause() -> dict[str, Any]:
    """Pausa manual. Idempotente — não sobrescreve uma pausa por previsão crítica."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(f"{ENGINE_URL}/engine/pause", json={"reason": "manual"})
        resp.raise_for_status()
        data = resp.json()
    return {"ok": True, "paused_reason": data.get("paused_reason", "manual")}


@router.post("/resume")
async def simulation_resume() -> dict[str, Any]:
    """Retoma após pausa manual. Rejeita 409 se pausa atual for previsao_critica."""
    cached = await state_cache.get()
    if cached and cached.get("paused_reason") == "previsao_critica":
        raise HTTPException(
            status_code=409,
            detail="Simulação pausada por previsão crítica — use /simulation/adjust",
        )
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(f"{ENGINE_URL}/engine/resume")
        resp.raise_for_status()
    return {"ok": True}


@router.post("/start", status_code=202)
async def simulation_start() -> dict[str, Any]:
    """Dispara a sequência automática de startup da barragem."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(f"{ENGINE_URL}/engine/start")
        if resp.status_code == 409:
            raise HTTPException(status_code=409, detail=resp.json().get("detail"))
        resp.raise_for_status()
    return {"ok": True}


class SpeedBody(BaseModel):
    fator: float = Field(ge=0.1, le=100.0)


@router.post("/speed")
async def simulation_speed(body: SpeedBody) -> dict[str, Any]:
    """Altera o fator_aceleracao do engine (reescalona o loop de simulação)."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(f"{ENGINE_URL}/engine/speed", json={"fator": body.fator})
        resp.raise_for_status()
    return {"ok": True, "fator": body.fator}


class ScenarioBody(BaseModel):
    tipo: Literal["chuva_intensa", "seca"]
    duracao_dias: int


@router.post("/scenario", status_code=202)
async def simulation_scenario(body: ScenarioBody) -> dict[str, Any]:
    """Inicia cenário de chuva intensa ou seca."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"{ENGINE_URL}/engine/scenario",
            json={"tipo": body.tipo, "duracao_dias": body.duracao_dias},
        )
        if resp.status_code == 422:
            raise HTTPException(status_code=422, detail=resp.json().get("detail"))
        resp.raise_for_status()
    return {"ok": True, "tipo": body.tipo, "duracao_dias": body.duracao_dias}


class ManualAdjustBody(BaseModel):
    comporta_01: float = Field(ge=0.0, le=100.0)
    comporta_02: float = Field(ge=0.0, le=100.0)
    comporta_03: float = Field(ge=0.0, le=100.0)
    comporta_04: float = Field(ge=0.0, le=100.0)
    turbina: Literal["LIGADO", "DESLIGADO"]


@router.post("/manual-adjust")
async def simulation_manual_adjust(body: ManualAdjustBody) -> dict[str, Any]:
    """Aplica valores de comportas + turbina definidos manualmente pelo operador.

    Substitui (na UI) o ajuste automático: o controle das comportas passa a ser
    do usuário, em tempo real. Mantém a restrição operacional do engine
    (comporta_02 ≤ comporta_03, rejeitada com 422).

    Se a simulação estiver pausada por previsão crítica, retoma após aplicar —
    preservando o fluxo de recuperação que o ajuste automático oferecia. Uma
    pausa manual NÃO é desfeita, para não surpreender quem pausou de propósito.
    """
    ajuste = body.model_dump()
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(f"{ENGINE_URL}/engine/adjust", json=ajuste)
        if resp.status_code == 422:
            raise HTTPException(status_code=422, detail=resp.json().get("detail"))
        resp.raise_for_status()
        cached = await state_cache.get()
        if cached and cached.get("paused_reason") == "previsao_critica":
            await client.post(f"{ENGINE_URL}/engine/resume")
    return {"ok": True, "ajuste_aplicado": ajuste}


@router.post("/adjust")
async def simulation_adjust() -> dict[str, Any]:
    """Calcula novos valores de comportas + turbina, aplica via engine, retoma se pausado."""
    cached = await state_cache.get()
    if cached is None:
        raise HTTPException(
            status_code=503,
            detail="Estado da simulação ainda não disponível",
        )

    sensors = cached.get("sensors", {})
    derived = cached.get("derived", {})
    if not sensors:
        raise HTTPException(status_code=503, detail="Sensores ainda não disponíveis")

    ajuste = compute_adjustment(sensors, derived)

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(f"{ENGINE_URL}/engine/adjust", json=ajuste)
        resp.raise_for_status()
        # Retoma independente do motivo da pausa
        if cached.get("status") == "PAUSADO":
            await client.post(f"{ENGINE_URL}/engine/resume")

    return {"ok": True, "ajuste_aplicado": ajuste}
