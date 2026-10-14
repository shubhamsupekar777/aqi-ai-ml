from backend.app.data.validators import validate_row, parse_float_safe

def test_validate_row_success():
    valid, err = validate_row("Delhi", "2026-10-12", 185.0)
    assert valid is True
    assert err is None

def test_validate_row_missing_city():
    valid, err = validate_row("", "2026-10-12", 185.0)
    assert valid is False
    assert "Missing required 'City'" in err

def test_validate_row_invalid_date():
    valid, err = validate_row("Delhi", "invalid-date", 185.0)
    assert valid is False
    assert "Invalid date format" in err

def test_validate_row_out_of_bounds_aqi():
    valid, err = validate_row("Delhi", "2026-10-12", 2500.0)
    assert valid is False
    assert "outside physiological range" in err

def test_parse_float_safe():
    assert parse_float_safe("123.45") == 123.45
    assert parse_float_safe(100) == 100.0
    assert parse_float_safe(None) is None
    assert parse_float_safe("invalid") is None
