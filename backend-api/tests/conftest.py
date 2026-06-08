"""Fixtures compartilhadas pelos testes do backend-api."""
from typing import Any

import pytest


@pytest.fixture
def make_sensors():
    """Factory de dicionário de sensores com defaults (todos zerados, turbina DESLIGADA)."""

    def _make(**values: Any) -> dict[str, dict[str, Any]]:
        defaults: dict[str, tuple[Any, str | None]] = {
            "sensor_chuva_01": (0.0, "mm/h"),
            "sensor_chuva_02": (0.0, "mm"),
            "sensor_comporta_01": (0.0, "%"),
            "sensor_enchimento_01": (0.0, "m³/h"),
            "sensor_comporta_02": (0.0, "%"),
            "sensor_fluxo_01": (0.0, "m³/h"),
            "sensor_comporta_03": (0.0, "%"),
            "sensor_fluxo_02": (0.0, "m³/h"),
            "sensor_comporta_04": (0.0, "%"),
            "sensor_esvaziamento_01": (0.0, "m³/h"),
            "sensor_turbina_01": ("DESLIGADO", None),
            "sensor_energia_01": (0.0, "kW/h"),
            "sensor_volume_01": (0.0, "%"),
            "sensor_volume_02": (0.0, "%"),
        }
        return {
            sid: {"valor": values.get(sid, default), "unidade": unit}
            for sid, (default, unit) in defaults.items()
        }

    return _make


@pytest.fixture
def make_derived():
    def _make(**values: float) -> dict[str, float]:
        defaults: dict[str, float] = {
            "capacidade_atual": 10.0,
            "contribuicao_chuva": 0.0,
            "taxa_liquida_01": 0.0,
            "taxa_liquida_02": 0.0,
        }
        defaults.update(values)
        return defaults

    return _make
