from collections import deque
from dataclasses import dataclass, field

CHUVA_WINDOW_SIZE = 720  # 30 dias × 24 horas


@dataclass
class EngineState:
    # Tempo simulado
    simulated_hours: int = 0
    fator_aceleracao: float = 1.0

    # Controle de execução
    # Começa pausada: a simulação só avança após "Iniciar Barragem" (/engine/start),
    # que retoma o loop e dispara a sequência de startup.
    paused: bool = True
    paused_reason: str | None = "manual"

    # Série de chuva (gerada no startup do engine)
    rain_series: list[float] = field(default_factory=list)
    rain_series_original: list[float] = field(default_factory=list)
    chuva_window: deque[float] = field(
        default_factory=lambda: deque(maxlen=CHUVA_WINDOW_SIZE)
    )

    # Comportas (% 0–100) — controladas via /engine/adjust no Slice 4
    comporta_01: float = 0.0
    comporta_02: float = 0.0
    comporta_03: float = 0.0
    comporta_04: float = 0.0

    # Turbina (controle externo — startup ou /engine/adjust)
    sensor_turbina_01: str = "DESLIGADO"

    # Sensores calculados a cada tick
    sensor_chuva_01: float = 0.0
    sensor_chuva_02: float = 0.0
    sensor_enchimento_01: float = 0.0
    sensor_fluxo_01: float = 0.0
    sensor_fluxo_02: float = 0.0
    sensor_esvaziamento_01: float = 0.0
    sensor_energia_01: float = 0.0
    sensor_volume_01: float = 0.0
    sensor_volume_02: float = 0.0

    # Valores derivados do tick (para rastreabilidade / motor de risco)
    capacidade_atual: float = 0.0
    contribuicao_chuva: float = 0.0
    taxa_liquida_01: float = 0.0
    taxa_liquida_02: float = 0.0

    # Cenário ativo
    scenario_active: str | None = None
    scenario_ticks_remaining: int | None = None

    # Sequência de startup em execução
    startup_active: bool = False

    def status(self) -> str:
        if self.paused:
            return "PAUSADO"
        if self.startup_active:
            return "INICIANDO"
        if self.scenario_active is not None:
            return "CENARIO_ATIVO"
        return "RODANDO"

    def reset(self) -> None:
        """Reinicia o estado para o início de uma nova partida (volta a pausada).

        Mantém o objeto (mutação in-place) para que uma sequência de startup em
        curso veja `paused=True` e aborte. A série de chuva é regerada pelo caller.
        """
        self.simulated_hours = 0
        self.paused = True
        self.paused_reason = "manual"
        self.chuva_window.clear()
        self.comporta_01 = 0.0
        self.comporta_02 = 0.0
        self.comporta_03 = 0.0
        self.comporta_04 = 0.0
        self.sensor_turbina_01 = "DESLIGADO"
        self.sensor_chuva_01 = 0.0
        self.sensor_chuva_02 = 0.0
        self.sensor_enchimento_01 = 0.0
        self.sensor_fluxo_01 = 0.0
        self.sensor_fluxo_02 = 0.0
        self.sensor_esvaziamento_01 = 0.0
        self.sensor_energia_01 = 0.0
        self.sensor_volume_01 = 0.0
        self.sensor_volume_02 = 0.0
        self.capacidade_atual = 0.0
        self.contribuicao_chuva = 0.0
        self.taxa_liquida_01 = 0.0
        self.taxa_liquida_02 = 0.0
        self.scenario_active = None
        self.scenario_ticks_remaining = None
        self.startup_active = False
