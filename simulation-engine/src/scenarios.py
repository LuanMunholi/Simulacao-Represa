from .state import EngineState

SCENARIO_RAIN_OVERRIDE: dict[str, float] = {
    "chuva_intensa": 20.0,
    "seca": 0.0,
}

VALID_DURATIONS: dict[str, tuple[int, ...]] = {
    "chuva_intensa": (1, 7, 15),
    "seca": (15, 30, 60),
}


def apply_scenario(state: EngineState, tipo: str, duracao_dias: int) -> None:
    """Ativa um cenário de chuva/seca. Não modifica rain_series — `compute_tick`
    consulta `state.scenario_active` para escolher o valor."""
    if tipo not in SCENARIO_RAIN_OVERRIDE:
        raise ValueError(f"tipo inválido: {tipo!r}")
    if duracao_dias not in VALID_DURATIONS[tipo]:
        raise ValueError(
            f"duracao_dias {duracao_dias} inválida para {tipo} "
            f"(válidos: {VALID_DURATIONS[tipo]})"
        )
    if state.scenario_active is not None:
        raise ValueError(
            f"já existe cenário ativo: {state.scenario_active} "
            f"({state.scenario_ticks_remaining} ticks restantes)"
        )

    state.scenario_active = tipo
    state.scenario_ticks_remaining = duracao_dias * 24


def tick_scenario(state: EngineState) -> None:
    """Chamado a cada tick de simulação. Decrementa o contador; encerra ao zerar."""
    if state.scenario_active is None or state.scenario_ticks_remaining is None:
        return
    state.scenario_ticks_remaining -= 1
    if state.scenario_ticks_remaining <= 0:
        state.scenario_active = None
        state.scenario_ticks_remaining = None
