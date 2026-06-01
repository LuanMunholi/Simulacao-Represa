from .scenarios import SCENARIO_RAIN_OVERRIDE
from .state import EngineState

TANK_VOLUME_M3 = 10_000.0  # capacidade máxima de cada tanque
MAX_VAZAO_M3H = 200.0  # vazão máxima nominal das comportas
ENERGIA_POR_M3H = 50.0  # kW/h gerado por m³/h passando na turbina


def _clamp(x: float, low: float, high: float) -> float:
    return max(low, min(high, x))


def compute_tick(state: EngineState) -> None:
    """Avança um tick (1 hora simulada) atualizando todos os sensores e derivados.

    Pré-condições:
      - state.rain_series tem 364 entradas (uma por dia)
      - state.simulated_hours é o valor ANTES do incremento (o caller incrementa após)
      - state.sensor_turbina_01 é gerido externamente — compute_tick apenas o lê

    Ordem de dependência conforme SLA 3.6.
    """
    # 1. Chuva — cenário ativo sobrepõe a série; senão indexa por dia
    if state.scenario_active in SCENARIO_RAIN_OVERRIDE:
        state.sensor_chuva_01 = SCENARIO_RAIN_OVERRIDE[state.scenario_active]
    else:
        dia_atual = state.simulated_hours // 24
        state.sensor_chuva_01 = state.rain_series[dia_atual % 364]

    # 2. Janela deslizante de 720h (= 30 dias) — sensor_chuva_02 é o acumulado
    state.chuva_window.append(state.sensor_chuva_01)
    state.sensor_chuva_02 = sum(state.chuva_window)

    # 3. capacidade_atual do sensor_enchimento_01 — escala com chuva acumulada
    state.capacidade_atual = min(
        200.0,
        max(10.0, (state.sensor_chuva_02 / 10.0) * 200.0),
    )

    # 4–7. Fluxos derivados das comportas
    state.sensor_enchimento_01 = (state.comporta_01 / 100.0) * state.capacidade_atual
    state.sensor_fluxo_01 = (state.comporta_02 / 100.0) * MAX_VAZAO_M3H
    state.sensor_fluxo_02 = min(
        (state.comporta_03 / 100.0) * MAX_VAZAO_M3H,
        state.sensor_fluxo_01,
    )
    state.sensor_esvaziamento_01 = (state.comporta_04 / 100.0) * MAX_VAZAO_M3H

    # 8. Energia — turbina controlada externamente
    if state.sensor_turbina_01 == "LIGADO":
        state.sensor_energia_01 = state.sensor_fluxo_01 * ENERGIA_POR_M3H
    else:
        state.sensor_energia_01 = 0.0

    # contribuicao_chuva (m³/h) = sensor_chuva_01 (mm/h) sobre 1.000 m² captação
    state.contribuicao_chuva = state.sensor_chuva_01

    # 9. Tanque superior — balanço de massa
    state.taxa_liquida_01 = (
        state.sensor_enchimento_01
        + state.contribuicao_chuva
        - state.sensor_fluxo_01
    )
    delta_v1_pct = state.taxa_liquida_01 / 100.0  # m³ → % (capacidade 10.000 m³)
    state.sensor_volume_01 = _clamp(state.sensor_volume_01 + delta_v1_pct, 0.0, 100.0)

    # 10. Tanque inferior — balanço de massa
    state.taxa_liquida_02 = (
        state.sensor_fluxo_02
        + state.contribuicao_chuva
        - state.sensor_esvaziamento_01
    )
    delta_v2_pct = state.taxa_liquida_02 / 100.0
    state.sensor_volume_02 = _clamp(state.sensor_volume_02 + delta_v2_pct, 0.0, 100.0)
