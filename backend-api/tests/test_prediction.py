from src.prediction import compute_predictions

TIME_STR = "1 de Janeiro de 2026, às 00:00"


def test_no_prediction_when_taxa_zero(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=50.0)
    d = make_derived(taxa_liquida_01=0.0, taxa_liquida_02=0.0)
    assert compute_predictions(s, d, TIME_STR) == []


def test_no_prediction_when_far_from_limit(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=50.0)
    d = make_derived(taxa_liquida_01=10.0)  # 5000 / 10 = 500h
    assert compute_predictions(s, d, TIME_STR) == []


def test_critico_overflow_perto_do_topo(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=99.0)
    d = make_derived(taxa_liquida_01=100.0)  # 100 m³ / 100 = 1h
    preds = compute_predictions(s, d, TIME_STR)
    assert len(preds) == 1
    p = preds[0]
    assert p.tanque == "superior"
    assert p.tipo == "overflow"
    assert p.severidade == "CRITICO"
    assert p.tempo_horas < 24


def test_alerta_overflow_entre_24_e_48h(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=50.0)
    d = make_derived(taxa_liquida_01=140.0)  # tempo ≈ 35.7h
    preds = compute_predictions(s, d, TIME_STR)
    assert len(preds) == 1
    assert preds[0].severidade == "ALERTA"
    assert 24 <= preds[0].tempo_horas < 48


def test_24h_exato_e_alerta(make_sensors, make_derived):
    # Tempo exatamente em 24h é ALERTA (limiar é < 24 para CRITICO)
    s = make_sensors(sensor_volume_01=50.0)
    d = make_derived(taxa_liquida_01=5000.0 / 24)  # tempo = 24h
    preds = compute_predictions(s, d, TIME_STR)
    assert preds[0].severidade == "ALERTA"


def test_critico_vazio_perto_do_zero(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=1.0)
    d = make_derived(taxa_liquida_01=-50.0)  # restam 100m³ → 2h
    preds = compute_predictions(s, d, TIME_STR)
    assert len(preds) == 1
    assert preds[0].tipo == "vazio"
    assert preds[0].severidade == "CRITICO"


def test_ambos_tanques_podem_ter_previsao(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=99.0, sensor_volume_02=99.0)
    d = make_derived(taxa_liquida_01=100.0, taxa_liquida_02=100.0)
    preds = compute_predictions(s, d, TIME_STR)
    assert len(preds) == 2
    assert {p.tanque for p in preds} == {"superior", "inferior"}


def test_mensagem_inclui_time_prefix(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=99.0)
    d = make_derived(taxa_liquida_01=100.0)
    preds = compute_predictions(s, d, TIME_STR)
    assert preds[0].mensagem.startswith(TIME_STR)
    assert "CRÍTICO" in preds[0].mensagem
    assert "transbordamento" in preds[0].mensagem
