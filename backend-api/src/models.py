from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    simulated_timestamp: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    sensor_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    unidade: Mapped[str | None] = mapped_column(String(16), nullable=True)
