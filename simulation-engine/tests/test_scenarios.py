import pytest

from src.scenarios import (
    SCENARIO_RAIN_OVERRIDE,
    VALID_DURATIONS,
    apply_scenario,
    tick_scenario,
)
from src.state import EngineState


def _state() -> EngineState:
    s = EngineState()
    s.rain_series = [5.0] * 364
    s.rain_series_original = list(s.rain_series)
    return s


def test_apply_chuva_intensa_activates_scenario():
    s = _state()
    apply_scenario(s, "chuva_intensa", 7)
    assert s.scenario_active == "chuva_intensa"
    assert s.scenario_ticks_remaining == 7 * 24


def test_apply_seca_activates_scenario():
    s = _state()
    apply_scenario(s, "seca", 30)
    assert s.scenario_active == "seca"
    assert s.scenario_ticks_remaining == 30 * 24


def test_reject_invalid_duration():
    s = _state()
    with pytest.raises(ValueError):
        apply_scenario(s, "chuva_intensa", 3)  # válido: 1, 7, 15


def test_reject_invalid_tipo():
    s = _state()
    with pytest.raises(ValueError):
        apply_scenario(s, "tempestade", 7)


def test_reject_when_scenario_active():
    s = _state()
    apply_scenario(s, "chuva_intensa", 1)
    with pytest.raises(ValueError):
        apply_scenario(s, "seca", 15)


def test_tick_scenario_decrements_counter():
    s = _state()
    apply_scenario(s, "chuva_intensa", 1)  # 24 ticks
    tick_scenario(s)
    assert s.scenario_ticks_remaining == 23


def test_tick_scenario_clears_when_done():
    s = _state()
    apply_scenario(s, "chuva_intensa", 1)
    for _ in range(24):
        tick_scenario(s)
    assert s.scenario_active is None
    assert s.scenario_ticks_remaining is None


def test_tick_scenario_no_op_when_inactive():
    s = _state()
    tick_scenario(s)  # nada para fazer; não deve crashar
    assert s.scenario_active is None


def test_override_values_match_spec():
    assert SCENARIO_RAIN_OVERRIDE["chuva_intensa"] == 20.0
    assert SCENARIO_RAIN_OVERRIDE["seca"] == 0.0


def test_valid_durations_match_spec():
    assert VALID_DURATIONS["chuva_intensa"] == (1, 7, 15)
    assert VALID_DURATIONS["seca"] == (15, 30, 60)
