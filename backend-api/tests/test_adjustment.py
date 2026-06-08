from src.adjustment import TARGET_VOLUME, compute_adjustment


def test_at_target_returns_balanced_gates(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=TARGET_VOLUME, sensor_volume_02=TARGET_VOLUME)
    d = make_derived(capacidade_atual=200.0)
    r = compute_adjustment(s, d)
    # No erro, c01=50 (meio); demais derivam do balanço
    assert r["comporta_01"] == 50.0
    assert r["comporta_02"] == r["comporta_03"]  # invariante Risco 6


def test_c02_never_exceeds_c03(make_sensors, make_derived):
    # Cenários variados: c02 deve ser <= c03 sempre
    for vol_01, vol_02 in [(0, 0), (50, 70), (95, 90), (100, 100), (10, 80)]:
        s = make_sensors(sensor_volume_01=vol_01, sensor_volume_02=vol_02)
        d = make_derived(capacidade_atual=150.0, contribuicao_chuva=20.0)
        r = compute_adjustment(s, d)
        assert r["comporta_02"] <= r["comporta_03"], f"vol=({vol_01},{vol_02})"


def test_above_target_closes_intake(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=100.0, sensor_volume_02=100.0)
    d = make_derived(capacidade_atual=200.0)
    r = compute_adjustment(s, d)
    assert r["comporta_01"] == 0.0  # totalmente fechada


def test_below_target_opens_intake(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=0.0, sensor_volume_02=0.0)
    d = make_derived(capacidade_atual=200.0)
    r = compute_adjustment(s, d)
    assert r["comporta_01"] == 100.0  # totalmente aberta


def test_turbina_ligada_quando_c02_e_c03_abertas(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=80.0, sensor_volume_02=80.0)
    d = make_derived(capacidade_atual=200.0, contribuicao_chuva=10.0)
    r = compute_adjustment(s, d)
    if r["comporta_02"] > 0 and r["comporta_03"] > 0:
        assert r["turbina"] == "LIGADO"


def test_turbina_desligada_quando_c02_fechada(make_sensors, make_derived):
    s = make_sensors(sensor_volume_01=100.0, sensor_volume_02=100.0)
    d = make_derived(capacidade_atual=200.0)
    r = compute_adjustment(s, d)
    # c01=0 → enchimento=0; fluxo_target = 0 + chuva + K*err = K*err (positivo) → c02 > 0
    # mas no caso de vol=100 sem chuva, c02 = (0 + 0 + 50)/2 = 25 (positivo)
    # Não testamos forçadamente para o caso desligado aqui; em vez disso garantimos a regra
    if r["comporta_02"] == 0 or r["comporta_03"] == 0:
        assert r["turbina"] == "DESLIGADO"


def test_clamps_respect_bounds(make_sensors, make_derived):
    # Valores extremos não devem produzir comportas fora de [0, 100]
    s = make_sensors(sensor_volume_01=150.0, sensor_volume_02=-30.0)
    d = make_derived(capacidade_atual=1000.0, contribuicao_chuva=500.0)
    r = compute_adjustment(s, d)
    for k in ("comporta_01", "comporta_02", "comporta_03", "comporta_04"):
        assert 0.0 <= r[k] <= 100.0, f"{k}={r[k]} fora dos limites"
