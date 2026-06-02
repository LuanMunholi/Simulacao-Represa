import os
from contextlib import asynccontextmanager
from typing import Any

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from sqlalchemy import insert

from .db import async_session, init_db
from .models import AlertHistory, SensorReading
from .prediction import compute_predictions
from .risk_engine import aggregate_alert_level, evaluate_risks
from .routers import history, internal, simulation
from .state_cache import state_cache
from .time_format import format_alert, format_display
from .ws_manager import manager

ENGINE_URL = os.getenv("ENGINE_INTERNAL_URL", "http://simulation-engine:8001")

TURBINA_STATE_TO_FLOAT = {"LIGADO": 1.0, "DESLIGADO": 0.0}

engine_client: httpx.AsyncClient | None = None


def _sensor_valor_to_float(valor: Any) -> float:
    if isinstance(valor, str):
        return TURBINA_STATE_TO_FLOAT.get(valor, 0.0)
    return float(valor)


async def pause_engine(reason: str) -> None:
    if engine_client is None:
        return
    try:
        await engine_client.post("/engine/pause", json={"reason": reason})
        print(f"[backend-api] requested engine pause (reason={reason})", flush=True)
    except Exception as e:
        print(f"[backend-api] pause engine failed: {e}", flush=True)


def _serialize_risks(risks) -> list[dict[str, Any]]:
    return [
        {
            "codigo": r.codigo,
            "severidade": r.severidade,
            "mensagem": r.mensagem,
            "sensores": r.sensores,
        }
        for r in risks
    ]


def _serialize_predictions(predictions) -> list[dict[str, Any]]:
    return [
        {
            "tanque": p.tanque,
            "tipo": p.tipo,
            "tempo_horas": p.tempo_horas,
            "severidade": p.severidade,
            "mensagem": p.mensagem,
        }
        for p in predictions
    ]


def build_broadcast(tick: dict[str, Any]) -> dict[str, Any]:
    """Constrói o payload completo a partir de um tick em cache (recomputa riscos/previsões)."""
    sensors = tick.get("sensors", {})
    derived = tick.get("derived", {})
    simulated_ts = tick["simulated_hours"]
    time_alert = format_alert(simulated_ts)
    risks = evaluate_risks(sensors, derived, time_alert) if sensors else []
    predictions = compute_predictions(sensors, derived, time_alert) if sensors else []
    return {
        **tick,
        "simulated_time": format_display(simulated_ts),
        "alert_level": aggregate_alert_level(risks),
        "active_risks": _serialize_risks(risks),
        "active_predictions": _serialize_predictions(predictions),
    }


async def display_tick() -> None:
    tick = await state_cache.get()
    if tick is None:
        return

    simulated_ts: int = tick["simulated_hours"]
    sensors: dict[str, dict[str, Any]] = tick.get("sensors", {})
    derived: dict[str, float] = tick.get("derived", {})
    time_alert = format_alert(simulated_ts)

    risks = evaluate_risks(sensors, derived, time_alert) if sensors else []
    predictions = compute_predictions(sensors, derived, time_alert) if sensors else []
    is_paused = tick.get("status") == "PAUSADO"

    # Quando pausado o engine não emite ticks novos — não persistir leituras nem alertas;
    # apenas re-broadcastar o estado em cache pros clientes conectados.
    # Também pular persistência se o tick atual tem o mesmo simulated_timestamp do anterior
    # (ocorre quando fator_aceleracao < 1: display roda mais rápido que o engine).
    if not is_paused and simulated_ts != state_cache.last_persisted_ts:
        state_cache.last_persisted_ts = simulated_ts
        sensor_rows = [
            {
                "simulated_timestamp": simulated_ts,
                "sensor_id": sid,
                "valor": _sensor_valor_to_float(reading["valor"]),
                "unidade": reading.get("unidade"),
            }
            for sid, reading in sensors.items()
        ]

        current_risk_codes = {r.codigo for r in risks}
        current_pred_keys = {(p.tanque, p.tipo, p.severidade) for p in predictions}
        new_risk_codes = current_risk_codes - state_cache.previous_risk_codes
        new_pred_keys = current_pred_keys - state_cache.previous_prediction_keys
        state_cache.previous_risk_codes = current_risk_codes
        state_cache.previous_prediction_keys = current_pred_keys

        alert_rows: list[dict[str, Any]] = []
        for r in risks:
            if r.codigo in new_risk_codes:
                alert_rows.append({
                    "simulated_timestamp": simulated_ts,
                    "tipo": "risco",
                    "severidade": r.severidade,
                    "mensagem": r.mensagem,
                    "leituras": r.sensores,
                })
        for p in predictions:
            if (p.tanque, p.tipo, p.severidade) in new_pred_keys:
                alert_rows.append({
                    "simulated_timestamp": simulated_ts,
                    "tipo": "previsao",
                    "severidade": p.severidade,
                    "mensagem": p.mensagem,
                    "leituras": {**p.sensores, "tempo_horas": p.tempo_horas},
                })

        if sensor_rows or alert_rows:
            async with async_session() as session:
                if sensor_rows:
                    await session.execute(insert(SensorReading), sensor_rows)
                if alert_rows:
                    await session.execute(insert(AlertHistory), alert_rows)
                await session.commit()

        # Pausa preventiva por previsão crítica
        if any(p.severidade == "CRITICO" for p in predictions):
            await pause_engine("previsao_critica")
            # Atualiza o cache para refletir a pausa imediatamente no próximo broadcast
            tick["status"] = "PAUSADO"
            tick["paused_reason"] = "previsao_critica"

    await manager.broadcast({
        **tick,
        "simulated_time": format_display(simulated_ts),
        "alert_level": aggregate_alert_level(risks),
        "active_risks": _serialize_risks(risks),
        "active_predictions": _serialize_predictions(predictions),
    })


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine_client
    await init_db()
    engine_client = httpx.AsyncClient(base_url=ENGINE_URL, timeout=5.0)
    scheduler = AsyncIOScheduler()
    scheduler.add_job(display_tick, "interval", seconds=1.0, id="display_tick")
    scheduler.start()
    print("[backend-api] started; display loop @ 1Hz", flush=True)
    try:
        yield
    finally:
        scheduler.shutdown()
        await engine_client.aclose()


app = FastAPI(lifespan=lifespan)
app.include_router(internal.router)
app.include_router(simulation.router)
app.include_router(history.router)


@app.get("/")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await manager.connect(ws)
    try:
        last = await state_cache.get()
        if last is not None:
            await ws.send_json(build_broadcast(last))
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(ws)
    except Exception:
        await manager.disconnect(ws)
