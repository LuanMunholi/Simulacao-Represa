from src.rain import generate_rain_series


def test_generates_364_values():
    series = generate_rain_series(seed=42)
    assert len(series) == 364


def test_all_values_non_negative():
    series = generate_rain_series(seed=42)
    assert all(v >= 0 for v in series)


def test_max_value_within_intense_rain_bound():
    series = generate_rain_series(seed=42)
    assert all(0 <= v <= 50 for v in series)


def test_deterministic_with_seed():
    a = generate_rain_series(seed=123)
    b = generate_rain_series(seed=123)
    assert a == b


def test_different_seeds_diverge():
    a = generate_rain_series(seed=1)
    b = generate_rain_series(seed=2)
    assert a != b
