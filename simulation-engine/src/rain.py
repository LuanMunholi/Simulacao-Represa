import random
from typing import Literal

Trend = Literal["sem_chuva", "pouca_chuva", "chuva_constante", "chuvas_intensas"]

TRENDS: tuple[Trend, ...] = (
    "sem_chuva",
    "pouca_chuva",
    "chuva_constante",
    "chuvas_intensas",
)


def _day_for_trend(trend: Trend, rng: random.Random) -> float:
    if trend == "sem_chuva":
        return 1.0 if rng.random() < 0.20 else 0.0
    if trend == "pouca_chuva":
        return rng.uniform(1.0, 5.0)
    if trend == "chuva_constante":
        return rng.uniform(5.0, 10.0)
    if trend == "chuvas_intensas":
        return rng.uniform(10.0, 50.0)
    raise ValueError(f"Unknown trend: {trend}")


def generate_rain_series(seed: int | None = None) -> list[float]:
    """Generate 364 daily rainfall values (mm/h) for one simulated year.

    Each of the 52 weeks gets a randomly chosen trend, and each day's value
    is drawn according to that trend's rule (Specs Seção 4, "Estados de Chuva").
    """
    rng = random.Random(seed)
    series: list[float] = []
    for _ in range(52):
        trend = rng.choice(TRENDS)
        for _ in range(7):
            series.append(_day_for_trend(trend, rng))
    assert len(series) == 364
    return series
