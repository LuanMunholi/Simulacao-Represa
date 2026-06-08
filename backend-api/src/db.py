import asyncio
import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .models import Base

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://represa:represa_dev@postgres:5432/represa",
)

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db() -> None:
    last_error: Exception | None = None
    for attempt in range(1, 11):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return
        except Exception as e:
            last_error = e
            print(f"[backend-api] DB not ready (attempt {attempt}/10): {e}", flush=True)
            await asyncio.sleep(2)
    raise RuntimeError(f"Could not connect to database after 10 attempts: {last_error}")
