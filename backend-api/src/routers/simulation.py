import os
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

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
