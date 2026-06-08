from fastapi import APIRouter
from pydantic import BaseModel

from ..state_cache import state_cache

router = APIRouter(prefix="/internal", tags=["internal"])


class SensorEntry(BaseModel):
    valor: float | str
    unidade: str | None = None


class DerivedEntry(BaseModel):
    capacidade_atual: float
    contribuicao_chuva: float
    taxa_liquida_01: float
    taxa_liquida_02: float


class TickPayload(BaseModel):
    simulated_hours: int
    fator_aceleracao: float
    status: str
    paused_reason: str | None = None
    scenario_active: str | None = None
    scenario_ticks_remaining: int | None = None
    sensors: dict[str, SensorEntry]
    derived: DerivedEntry


@router.post("/tick")
async def receive_tick(payload: TickPayload) -> dict[str, bool]:
    await state_cache.update(payload.model_dump())
    return {"ok": True}
