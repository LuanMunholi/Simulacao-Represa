from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    simulated_timestamp: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    sensor_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    unidade: Mapped[str | None] = mapped_column(String(16), nullable=True)


class AlertHistory(Base):
    __tablename__ = "alert_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    simulated_timestamp: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    tipo: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    severidade: Mapped[str] = mapped_column(String(16), nullable=False)
    mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    leituras: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
