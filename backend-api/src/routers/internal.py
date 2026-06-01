from fastapi import APIRouter
from pydantic import BaseModel

from ..state_cache import state_cache

router = APIRouter(prefix="/internal", tags=["internal"])


class TickPayload(BaseModel):
    simulated_hours: int
    fator_aceleracao: float
    dummy_value: float


@router.post("/tick")
async def receive_tick(payload: TickPayload) -> dict[str, bool]:
    await state_cache.update(payload.model_dump())
    return {"ok": True}
