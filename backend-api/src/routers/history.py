from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select, text

from ..db import async_session
from ..models import AlertHistory, SensorReading
from ..time_format import format_alert

router = APIRouter(prefix="/history", tags=["history"])

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


@router.get("/alerts")
async def get_alerts(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=500),
) -> dict[str, Any]:
    offset = (page - 1) * per_page
    async with async_session() as session:
        total_q = await session.execute(select(func.count()).select_from(AlertHistory))
        total = total_q.scalar() or 0
        result = await session.execute(
            select(AlertHistory)
            .order_by(AlertHistory.simulated_timestamp.desc(), AlertHistory.id.desc())
            .limit(per_page)
            .offset(offset)
        )
        rows = result.scalars().all()
    return {
        "page": page,
        "per_page": per_page,
        "total": total,
        "items": [
            {
                "id": r.id,
                "simulated_timestamp": r.simulated_timestamp,
                "simulated_time": format_alert(r.simulated_timestamp),
                "tipo": r.tipo,
                "severidade": r.severidade,
                "mensagem": r.mensagem,
                "leituras": r.leituras,
            }
            for r in rows
        ],
    }


@router.get("/sensors/{sensor_id}")
async def get_sensor_history(
    sensor_id: str,
    horas: int = Query(720, ge=1, le=10000),
) -> dict[str, Any]:
    """Últimas N horas simuladas de um sensor, ASC por timestamp."""
    if sensor_id not in SENSOR_UNITS:
        raise HTTPException(status_code=404, detail=f"sensor_id inválido: {sensor_id}")

    async with async_session() as session:
        latest_q = await session.execute(
            select(func.max(SensorReading.simulated_timestamp)).where(
                SensorReading.sensor_id == sensor_id
            )
        )
        latest = latest_q.scalar() or 0
        cutoff = max(0, latest - horas + 1)

        # DISTINCT ON garante 1 ponto por simulated_timestamp mesmo com legacy duplicates
        # (pré-deduplicação). Pega a linha mais recente (max id) para cada timestamp.
        result = await session.execute(
            text("""
                SELECT DISTINCT ON (simulated_timestamp) simulated_timestamp, valor
                FROM sensor_readings
                WHERE sensor_id = :sid AND simulated_timestamp >= :cutoff
                ORDER BY simulated_timestamp ASC, id DESC
            """),
            {"sid": sensor_id, "cutoff": cutoff},
        )
        rows = result.all()

    return {
        "sensor_id": sensor_id,
        "unidade": SENSOR_UNITS[sensor_id],
        "horas": horas,
        "items": [{"simulated_timestamp": ts, "valor": v} for ts, v in rows],
    }
