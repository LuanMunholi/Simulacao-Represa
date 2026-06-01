from typing import Any

TARGET_VOLUME = 90.0  # % alvo de ambos os tanques (estado operacional ideal)
K_INTAKE = 10.0  # responsividade do controle de comporta_01
K_NET = 5.0  # responsividade do controle de fluxo líquido


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def compute_adjustment(
    sensors: dict[str, dict[str, Any]],
    derived: dict[str, float],
) -> dict[str, Any]:
    """Calcula novos valores de comportas + estado da turbina para estabilizar
    ambos os tanques em ~90% (Specs Seção 8).

    Estratégia:
      1. comporta_01 é proporcional ao erro inverso (fecha quando vol_01 > 90)
      2. comporta_02 é derivada de um balanço de massa com correção pelo erro
      3. comporta_03 = comporta_02 (mantém Risco 6 desativado + restrição c02≤c03)
      4. comporta_04 é derivada de um balanço de massa do tanque inferior
      5. turbina LIGADA sse c02 > 0 E c03 > 0 (invariante operacional)
    """
    vol_01 = sensors["sensor_volume_01"]["valor"]
    vol_02 = sensors["sensor_volume_02"]["valor"]
    chuva = derived["contribuicao_chuva"]
    capacidade = derived["capacidade_atual"]

    err_01 = vol_01 - TARGET_VOLUME
    err_02 = vol_02 - TARGET_VOLUME

    # Tanque 1: ajusta comporta_01 e deriva comporta_02
    comporta_01 = _clamp(50.0 - K_INTAKE * err_01, 0.0, 100.0)
    enchimento_01 = (comporta_01 / 100.0) * capacidade
    fluxo_01_target = enchimento_01 + chuva + K_NET * err_01
    comporta_02 = _clamp(fluxo_01_target / 200.0 * 100.0, 0.0, 100.0)

    # Tanque 2: c03 espelha c02; ajusta c04 para balanço
    comporta_03 = comporta_02
    fluxo_02 = min((comporta_03 / 100.0) * 200.0, (comporta_02 / 100.0) * 200.0)
    esv_target = fluxo_02 + chuva + K_NET * err_02
    comporta_04 = _clamp(esv_target / 200.0 * 100.0, 0.0, 100.0)

    turbina = "LIGADO" if (comporta_02 > 0 and comporta_03 > 0) else "DESLIGADO"

    return {
        "comporta_01": comporta_01,
        "comporta_02": comporta_02,
        "comporta_03": comporta_03,
        "comporta_04": comporta_04,
        "turbina": turbina,
    }
