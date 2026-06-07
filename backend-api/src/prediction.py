from dataclasses import dataclass
from typing import Any, Literal

TANK_VOLUME_M3 = 10_000.0
CRITICO_HORAS = 24.0
ALERTA_HORAS = 48.0


@dataclass(frozen=True)
class Prediction:
    tanque: Literal["superior", "inferior"]
    tipo: Literal["overflow", "vazio"]
    tempo_horas: float
    severidade: Literal["ALERTA", "CRITICO"]
    mensagem: str
    sensores: dict[str, float]


def _classify(tempo_horas: float) -> str | None:
    if tempo_horas < CRITICO_HORAS:
        return "CRITICO"
    if tempo_horas < ALERTA_HORAS:
        return "ALERTA"
    return None


def _build_message(time_str: str, tipo: str, tank_name: str, tempo: float, severidade: str) -> str:
    event = "transbordamento" if tipo == "overflow" else "esvaziamento"
    if severidade == "CRITICO":
        return (
            f"{time_str} - CRÍTICO: Previsão de {event} no Tanque {tank_name} "
            f"em aproximadamente {tempo:.1f}h. Aja agora nas comportas para evitar a falha!"
        )
    return (
        f"{time_str} - ALERTA: Previsão de {event} no Tanque {tank_name} "
        f"em aproximadamente {tempo:.1f}h. Ajuste as comportas para evitar a situação crítica."
    )


def _predict_tank(
    vol_pct: float,
    taxa_liquida: float,
    tank_name: str,
    tanque_id: Literal["superior", "inferior"],
    volume_sensor_id: str,
    taxa_field: str,
    time_str: str,
) -> Prediction | None:
    if taxa_liquida == 0:
        return None

    if taxa_liquida > 0:
        volume_restante = (1.0 - vol_pct / 100.0) * TANK_VOLUME_M3
        tempo = volume_restante / taxa_liquida
        tipo: Literal["overflow", "vazio"] = "overflow"
    else:
        volume_atual = (vol_pct / 100.0) * TANK_VOLUME_M3
        tempo = volume_atual / abs(taxa_liquida)
        tipo = "vazio"

    severidade = _classify(tempo)
    if severidade is None:
        return None

    return Prediction(
        tanque=tanque_id,
        tipo=tipo,
        tempo_horas=tempo,
        severidade=severidade,  # type: ignore[arg-type]
        mensagem=_build_message(time_str, tipo, tank_name, tempo, severidade),
        sensores={
            volume_sensor_id: vol_pct,
            taxa_field: taxa_liquida,
        },
    )


def compute_predictions(
    sensors: dict[str, dict[str, Any]],
    derived: dict[str, float],
    time_str: str,
) -> list[Prediction]:
    """Projeção linear de overflow/vazio por tanque (Specs Seção 5.1)."""
    vol_01 = sensors["sensor_volume_01"]["valor"]
    vol_02 = sensors["sensor_volume_02"]["valor"]
    taxa_01 = derived["taxa_liquida_01"]
    taxa_02 = derived["taxa_liquida_02"]

    predictions: list[Prediction] = []
    p1 = _predict_tank(vol_01, taxa_01, "Superior", "superior", "sensor_volume_01", "taxa_liquida_01", time_str)
    if p1:
        predictions.append(p1)
    p2 = _predict_tank(vol_02, taxa_02, "Inferior", "inferior", "sensor_volume_02", "taxa_liquida_02", time_str)
    if p2:
        predictions.append(p2)
    return predictions
