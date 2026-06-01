"""Verifica que compute_tick respeita o scenario_active (sobrepondo rain_series)."""
from src.sensors import compute_tick
from src.state import EngineState


def _state() -> EngineState:
    s = EngineState()
    s.rain_series = [3.0] * 364  # default da série: 3 mm/h
    return s


def test_no_scenario_uses_rain_series():
    s = _state()
    compute_tick(s)
    assert s.sensor_chuva_01 == 3.0


def test_chuva_intensa_overrides_to_20():
    s = _state()
    s.scenario_active = "chuva_intensa"
    compute_tick(s)
    assert s.sensor_chuva_01 == 20.0


def test_seca_overrides_to_zero():
    s = _state()
    s.scenario_active = "seca"
    compute_tick(s)
    assert s.sensor_chuva_01 == 0.0
