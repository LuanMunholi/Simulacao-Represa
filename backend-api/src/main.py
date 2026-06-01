from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from sqlalchemy import insert

from .db import async_session, init_db
from .models import SensorReading
from .routers import internal
from .state_cache import state_cache
from .ws_manager import manager

BASE_DATE = datetime(2026, 1, 1, 0, 0)
TURBINA_STATE_TO_FLOAT = {"LIGADO": 1.0, "DESLIGADO": 0.0}


def format_simulated_time(simulated_hours: int) -> str:
    dt = BASE_DATE + timedelta(hours=simulated_hours)
    return f"Dia {dt.day}, Mês {dt.month} de {dt.year}, às {dt.hour:02d}:{dt.minute:02d}"


def _sensor_valor_to_float(valor: Any) -> float:
    if isinstance(valor, str):
        return TURBINA_STATE_TO_FLOAT.get(valor, 0.0)
    return float(valor)


def make_broadcast_payload(tick: dict[str, Any]) -> dict[str, Any]:
    return {
        **tick,
        "simulated_time": format_simulated_time(tick["simulated_hours"]),
        "alert_level": "VERDE",
        "active_risks": [],
        "active_predictions": [],
    }


async def display_tick() -> None:
    tick = await state_cache.get()
    if tick is None:
        return

    simulated_ts = tick["simulated_hours"]
    sensors = tick.get("sensors", {})

    rows = [
        {
            "simulated_timestamp": simulated_ts,
            "sensor_id": sid,
            "valor": _sensor_valor_to_float(reading["valor"]),
            "unidade": reading.get("unidade"),
        }
        for sid, reading in sensors.items()
    ]
    if rows:
        async with async_session() as session:
            await session.execute(insert(SensorReading), rows)
            await session.commit()

    await manager.broadcast(make_broadcast_payload(tick))


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    scheduler = AsyncIOScheduler()
    scheduler.add_job(display_tick, "interval", seconds=1.0, id="display_tick")
    scheduler.start()
    print("[backend-api] started; display loop @ 1Hz", flush=True)
    try:
        yield
    finally:
        scheduler.shutdown()


app = FastAPI(lifespan=lifespan)
app.include_router(internal.router)


@app.get("/")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await manager.connect(ws)
    try:
        last = await state_cache.get()
        if last is not None:
            await ws.send_json(make_broadcast_payload(last))
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(ws)
    except Exception:
        await manager.disconnect(ws)
