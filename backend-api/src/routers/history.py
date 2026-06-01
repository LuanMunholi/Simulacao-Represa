from typing import Any

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from ..db import async_session
from ..models import AlertHistory
from ..time_format import format_alert

router = APIRouter(prefix="/history", tags=["history"])


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
