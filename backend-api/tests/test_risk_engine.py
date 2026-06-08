from src.risk_engine import RiskAlert, aggregate_alert_level, evaluate_risks

TIME_STR = "1 de Janeiro de 2026, às 00:00"


def _codes(sensors, derived):
    return {r.codigo for r in evaluate_risks(sensors, derived, TIME_STR)}


def test_initial_state_fires_only_risco_03(make_sensors, make_derived):
    # No boot da simulação (tudo zerado), apenas Risco 3 dispara:
    # volume_01 < 20% + enchimento_01 = 0 + comporta_01 = 0%
    assert _codes(make_sensors(), make_derived()) == {"RISCO_03"}


def test_risk_01_transbordamento_superior(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=95.0, sensor_enchimento_01=100.0, sensor_fluxo_01=50.0)
    d = make_derived(contribuicao_chuva=10.0)
    assert "RISCO_01" in _codes(s, d)


def test_risk_02_esvaziamento_superior(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=10.0, sensor_fluxo_01=50.0, sensor_enchimento_01=20.0)
    assert "RISCO_02" in _codes(s, make_derived())


def test_risk_03_estagnado_superior(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=10.0, sensor_enchimento_01=0.0, sensor_comporta_01=0.0)
    assert "RISCO_03" in _codes(s, make_derived())


def test_risk_04_transbordamento_inferior(make_sensors, make_derived):
    s = make_sensors(sensor_volume_02=95.0, sensor_fluxo_02=100.0, sensor_esvaziamento_01=50.0)
    assert "RISCO_04" in _codes(s, make_derived())


def test_risk_05_esvaziamento_inferior(make_sensors, make_derived):
    s = make_sensors(sensor_volume_02=10.0, sensor_esvaziamento_01=100.0, sensor_fluxo_02=50.0)
    assert "RISCO_05" in _codes(s, make_derived())


def test_risk_06_comportas_desbalanceadas(make_sensors, make_derived):
    s = make_sensors(sensor_comporta_02=40.0, sensor_comporta_03=60.0)
    assert "RISCO_06" in _codes(s, make_derived())


def test_risk_07_comporta02_excedendo_03_e_implica_risco_06(make_sensors, make_derived):
    s = make_sensors(sensor_comporta_02=80.0, sensor_comporta_03=60.0)
    codes = _codes(s, make_derived())
    assert "RISCO_07" in codes
    assert "RISCO_06" in codes


def test_risk_08_turbina_desligada_com_comportas_abertas(make_sensors, make_derived):
    s = make_sensors(
        sensor_turbina_01="DESLIGADO",
        sensor_comporta_02=50.0,
        sensor_comporta_03=50.0,
    )
    assert "RISCO_08" in _codes(s, make_derived())


def test_risk_09_turbina_ligada_sem_fluxo(make_sensors, make_derived):
    s = make_sensors(sensor_turbina_01="LIGADO", sensor_fluxo_01=0.0)
    assert "RISCO_09" in _codes(s, make_derived())


def test_risk_10_desequilibrio_entre_tanques(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=80.0, sensor_volume_02=50.0)
    assert "RISCO_10" in _codes(s, make_derived())


def test_aggregate_alert_levels():
    def a(sev: str) -> RiskAlert:
        return RiskAlert(codigo="R", severidade=sev, mensagem="", sensores={})

    assert aggregate_alert_level([]) == "VERDE"
    assert aggregate_alert_level([a("ALTA")]) == "AMARELO"
    assert aggregate_alert_level([a("ALTA"), a("MEDIA")]) == "LARANJA"
    assert aggregate_alert_level([a("ALTA"), a("MEDIA"), a("BAIXA")]) == "VERMELHO"
    assert aggregate_alert_level([a("BAIXA")] * 5) == "VERMELHO"


def test_message_includes_time_prefix(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=95.0, sensor_enchimento_01=100.0, sensor_fluxo_01=50.0)
    d = make_derived(contribuicao_chuva=10.0)
    risks = evaluate_risks(s, d, TIME_STR)
    assert any(r.mensagem.startswith(TIME_STR) for r in risks)
