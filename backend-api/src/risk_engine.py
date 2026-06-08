from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class RiskAlert:
    codigo: str
    severidade: str  # BAIXA | MEDIA | ALTA | CRITICA
    mensagem: str
    sensores: dict[str, float | str]


def aggregate_alert_level(risks: list[RiskAlert]) -> str:
    n = len(risks)
    if n == 0:
        return "VERDE"
    if n == 1:
        return "AMARELO"
    if n == 2:
        return "LARANJA"
    return "VERMELHO"


def evaluate_risks(
    sensors: dict[str, dict[str, Any]],
    derived: dict[str, float],
    time_str: str,
) -> list[RiskAlert]:
    """Avalia as 10 regras de risco (Specs Seção 6) e retorna a lista de ativos."""

    def v(sid: str) -> Any:
        return sensors[sid]["valor"]

    vol_01 = v("sensor_volume_01")
    vol_02 = v("sensor_volume_02")
    enchimento = v("sensor_enchimento_01")
    fluxo_01 = v("sensor_fluxo_01")
    fluxo_02 = v("sensor_fluxo_02")
    esvaziamento = v("sensor_esvaziamento_01")
    comporta_01 = v("sensor_comporta_01")
    comporta_02 = v("sensor_comporta_02")
    comporta_03 = v("sensor_comporta_03")
    turbina = v("sensor_turbina_01")
    chuva_01 = v("sensor_chuva_01")
    chuva = derived["contribuicao_chuva"]

    risks: list[RiskAlert] = []

    # RISCO_01 (ALTA) — Transbordamento Tanque Superior
    if vol_01 > 90 and (enchimento + chuva) > fluxo_01:
        risks.append(RiskAlert(
            codigo="RISCO_01",
            severidade="ALTA",
            mensagem=f"{time_str} - Risco de Transbordamento no Tanque Superior por alto volume de água, excesso de chuva e valor de enchimento maior que o de vazão.",
            sensores={
                "sensor_volume_01": vol_01,
                "sensor_chuva_01": chuva_01,
                "sensor_enchimento_01": enchimento,
                "sensor_fluxo_01": fluxo_01,
            },
        ))

    # RISCO_02 (MEDIA) — Esvaziamento Tanque Superior
    if vol_01 < 20 and fluxo_01 > enchimento:
        risks.append(RiskAlert(
            codigo="RISCO_02",
            severidade="MEDIA",
            mensagem=f"{time_str} - Risco de Esvaziamento no Tanque Superior por volume baixo e vazão de saída superior à taxa de enchimento.",
            sensores={
                "sensor_volume_01": vol_01,
                "sensor_enchimento_01": enchimento,
                "sensor_fluxo_01": fluxo_01,
            },
        ))

    # RISCO_03 (BAIXA) — Enchimento Estagnado Tanque Superior
    if vol_01 < 20 and enchimento == 0 and comporta_01 == 0:
        risks.append(RiskAlert(
            codigo="RISCO_03",
            severidade="BAIXA",
            mensagem=f"{time_str} - Tanque Superior com volume baixo e sem entrada de água ativa. Comporta de enchimento está fechada.",
            sensores={
                "sensor_volume_01": vol_01,
                "sensor_enchimento_01": enchimento,
                "sensor_comporta_01": comporta_01,
            },
        ))

    # RISCO_04 (ALTA) — Transbordamento Tanque Inferior
    if vol_02 > 90 and fluxo_02 > esvaziamento:
        risks.append(RiskAlert(
            codigo="RISCO_04",
            severidade="ALTA",
            mensagem=f"{time_str} - Risco de Transbordamento no Tanque Inferior por volume elevado e fluxo de entrada superior à taxa de esvaziamento.",
            sensores={
                "sensor_volume_02": vol_02,
                "sensor_fluxo_02": fluxo_02,
                "sensor_esvaziamento_01": esvaziamento,
                "sensor_chuva_01": chuva_01,
            },
        ))

    # RISCO_05 (MEDIA) — Esvaziamento Tanque Inferior
    if vol_02 < 20 and esvaziamento > fluxo_02:
        risks.append(RiskAlert(
            codigo="RISCO_05",
            severidade="MEDIA",
            mensagem=f"{time_str} - Risco de Esvaziamento no Tanque Inferior por volume baixo e taxa de esvaziamento superior ao fluxo de entrada.",
            sensores={
                "sensor_volume_02": vol_02,
                "sensor_fluxo_02": fluxo_02,
                "sensor_esvaziamento_01": esvaziamento,
            },
        ))

    # RISCO_06 (MEDIA) — Desbalanceamento Comporta_02 vs Comporta_03
    if comporta_02 != comporta_03:
        risks.append(RiskAlert(
            codigo="RISCO_06",
            severidade="MEDIA",
            mensagem=f"{time_str} - Comportas do interior da barragem em estados de abertura diferentes. O estado ideal é que ambas estejam no mesmo percentual.",
            sensores={
                "sensor_comporta_02": comporta_02,
                "sensor_comporta_03": comporta_03,
            },
        ))

    # RISCO_07 (CRITICA) — Comporta_02 excedendo Comporta_03
    if comporta_02 > comporta_03:
        risks.append(RiskAlert(
            codigo="RISCO_07",
            severidade="CRITICA",
            mensagem=f"{time_str} - CRÍTICO: Violação operacional detectada. A comporta de fluxo do tanque superior está mais aberta do que a comporta da barragem, o que não é permitido.",
            sensores={
                "sensor_comporta_02": comporta_02,
                "sensor_comporta_03": comporta_03,
            },
        ))

    # RISCO_08 (ALTA) — Turbina desligada com comportas abertas
    if turbina == "DESLIGADO" and comporta_02 > 0 and comporta_03 > 0:
        risks.append(RiskAlert(
            codigo="RISCO_08",
            severidade="ALTA",
            mensagem=f"{time_str} - Água circulando pelo interior da barragem com a turbina desligada. A turbina deve estar ativa sempre que as comportas 02 e 03 estiverem abertas.",
            sensores={
                "sensor_turbina_01": turbina,
                "sensor_comporta_02": comporta_02,
                "sensor_comporta_03": comporta_03,
            },
        ))

    # RISCO_09 (CRITICA) — Turbina ligada sem fluxo
    if turbina == "LIGADO" and fluxo_01 == 0:
        risks.append(RiskAlert(
            codigo="RISCO_09",
            severidade="CRITICA",
            mensagem=f"{time_str} - CRÍTICO: Turbina em operação sem passagem de água. Risco de dano mecânico iminente.",
            sensores={
                "sensor_turbina_01": turbina,
                "sensor_fluxo_01": fluxo_01,
            },
        ))

    # RISCO_10 (BAIXA) — Desequilíbrio entre tanques
    if abs(vol_01 - vol_02) >= 20:
        risks.append(RiskAlert(
            codigo="RISCO_10",
            severidade="BAIXA",
            mensagem=f"{time_str} - Diferença significativa entre os volumes dos tanques superior e inferior. O estado ideal é que ambos se mantenham próximos de 90%.",
            sensores={
                "sensor_volume_01": vol_01,
                "sensor_volume_02": vol_02,
            },
        ))

    return risks
