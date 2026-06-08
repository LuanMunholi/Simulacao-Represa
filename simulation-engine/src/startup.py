import asyncio

from .state import EngineState


async def run_startup_sequence(state: EngineState) -> None:
    """Sequência automática de inicialização da barragem (Specs Seção 9).

    Estágios:
      1. Abre comporta_01 (capacidade máxima) → enche o tanque superior
      2. Em vol_01 ≥ 90%: abre comporta_02/03 + liga turbina → enche o inferior
      3. Em vol_02 ≥ 90%: ajusta comportas para regime de operação estável (~90/90)

    O motor de risco do backend desativa a auto-pausa por previsão crítica
    enquanto `status = INICIANDO`, para não interromper o enchimento.
    """
    if state.startup_active:
        return
    state.startup_active = True
    # A simulação inicia pausada; "Iniciar Barragem" retoma o loop para que os
    # sensores voltem a ser calculados e os tanques possam encher.
    state.paused = False
    state.paused_reason = None
    try:
        # Estágio 1: encher tanque superior
        state.comporta_01 = 100.0
        print("[engine] startup: stage 1 — comporta_01=100, enchendo tanque superior", flush=True)
        while state.sensor_volume_01 < 90.0:
            if state.paused:
                print("[engine] startup abortado (pausado)", flush=True)
                return
            await asyncio.sleep(0.1)

        # Estágio 2: abrir comportas 02/03, ligar turbina, encher tanque inferior
        state.comporta_02 = 100.0
        state.comporta_03 = 100.0
        state.sensor_turbina_01 = "LIGADO"
        print(
            "[engine] startup: stage 2 — comporta_02/03=100, turbina LIGADO, "
            "enchendo tanque inferior",
            flush=True,
        )
        while state.sensor_volume_02 < 90.0:
            if state.paused:
                print("[engine] startup abortado (pausado)", flush=True)
                return
            await asyncio.sleep(0.1)

        # Estágio 3: regime de operação — 50% nas 4 comportas mantém um equilíbrio aproximado
        # (com c01=c02=50 e capacidade_atual ~variando, vol_01 estabiliza próximo de 90 sob chuva
        # média; o usuário pode acionar /simulation/adjust para refinar a qualquer momento).
        state.comporta_01 = 50.0
        state.comporta_02 = 50.0
        state.comporta_03 = 50.0
        state.comporta_04 = 50.0
        # turbina permanece LIGADO
        print("[engine] startup complete — operação estável", flush=True)
    finally:
        state.startup_active = False
