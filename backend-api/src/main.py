from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from sqlalchemy import insert

from .db import async_session, init_db
from .models import SensorReading
from .routers import internal
from .state_cache import state_cache
from .ws_manager import manager


async def display_tick() -> None:
    tick = await state_cache.get()
    if tick is None:
        return
    async with async_session() as session:
        await session.execute(
            insert(SensorReading).values(
                simulated_timestamp=tick["simulated_hours"],
                sensor_id="dummy",
                valor=tick["dummy_value"],
                unidade=None,
            )
        )
        await session.commit()
    await manager.broadcast(tick)


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
            await ws.send_json(last)
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(ws)
    except Exception:
        await manager.disconnect(ws)
