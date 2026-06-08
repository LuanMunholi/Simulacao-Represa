from src.sensors import compute_tick
from src.state import EngineState


def _state_with_flat_rain(rate: float = 0.0) -> EngineState:
    s = EngineState()
    s.rain_series = [rate] * 364
    return s


def test_no_rain_no_comportas_volumes_unchanged():
    s = _state_with_flat_rain(0.0)
    compute_tick(s)
    assert s.sensor_volume_01 == 0.0
    assert s.sensor_volume_02 == 0.0


def test_volume_clamp_upper_bound():
    s = _state_with_flat_rain(50.0)
    s.sensor_volume_01 = 99.9
    s.sensor_volume_02 = 99.9
    # Saturate the window so capacidade_atual ramps up
    for _ in range(720):
        s.chuva_window.append(50.0)
    compute_tick(s)
    assert s.sensor_volume_01 <= 100.0
    assert s.sensor_volume_02 <= 100.0


def test_volume_clamp_lower_bound():
    s = _state_with_flat_rain(0.0)
    s.sensor_volume_01 = 0.1
    s.sensor_volume_02 = 0.1
    s.comporta_02 = 100.0  # fluxo_01 = 200 m³/h
    s.comporta_03 = 100.0
    s.comporta_04 = 100.0  # esvaziamento = 200 m³/h
    compute_tick(s)
    assert s.sensor_volume_01 >= 0.0
    assert s.sensor_volume_02 >= 0.0


def test_compute_tick_does_not_modify_turbina():
    s = _state_with_flat_rain()
    s.sensor_turbina_01 = "LIGADO"
    s.comporta_02 = 0.0
    s.comporta_03 = 0.0
    compute_tick(s)
    assert s.sensor_turbina_01 == "LIGADO"  # turbina é controle externo


def test_energy_zero_when_turbine_off():
    s = _state_with_flat_rain()
    s.sensor_turbina_01 = "DESLIGADO"
    s.comporta_02 = 50.0
    compute_tick(s)
    assert s.sensor_energia_01 == 0.0


def test_energy_linear_with_fluxo_when_turbine_on():
    s = _state_with_flat_rain()
    s.sensor_turbina_01 = "LIGADO"
    s.comporta_02 = 50.0  # fluxo_01 = 50% × 200 = 100 m³/h → 100 × 50 = 5000 kW/h
    compute_tick(s)
    assert s.sensor_energia_01 == 5000.0


def test_rain_indexed_by_day_not_by_tick():
    s = _state_with_flat_rain()
    # Each day in rain_series has a distinct value matching the day index
    s.rain_series = [float(i) for i in range(364)]
    # Ticks 0..23 → simulated_hours=0..23 → day 0
    for h in range(24):
        s.simulated_hours = h
        compute_tick(s)
        assert s.sensor_chuva_01 == 0.0, f"hour {h}"
    # simulated_hours=24 → day 1
    s.simulated_hours = 24
    compute_tick(s)
    assert s.sensor_chuva_01 == 1.0


def test_fluxo_02_bounded_by_fluxo_01():
    s = _state_with_flat_rain()
    s.comporta_02 = 50.0  # fluxo_01 = 100
    s.comporta_03 = 100.0  # cap fluxo_02 = 200, mas é cortado por fluxo_01
    compute_tick(s)
    assert s.sensor_fluxo_02 == 100.0


def test_capacidade_atual_minimum():
    s = _state_with_flat_rain(0.0)
    compute_tick(s)
    assert s.capacidade_atual == 10.0  # piso


def test_capacidade_atual_maximum_saturated():
    s = _state_with_flat_rain(50.0)
    for _ in range(720):
        s.chuva_window.append(50.0)
    compute_tick(s)
    assert s.capacidade_atual == 200.0  # teto
