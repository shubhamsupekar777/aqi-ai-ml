from datetime import datetime, timezone, timedelta

import pytest

from backend.app.services.observation_freshness import classify_freshness, freshness_fields, parse_timestamp

NOW = datetime(2026, 10, 19, 14, 51, 13, tzinfo=timezone.utc)

def test_fresh_naive_observation_timestamp():
    assert classify_freshness("2026-10-18T14:00:00", now=NOW) == "fresh"

def test_stale_observation_timestamp():
    assert classify_freshness("2025-05-23T21:00:00+05:30", now=NOW) == "stale"

def test_missing_timestamp_is_unknown():
    assert classify_freshness(None, now=NOW) == "unknown"

def test_invalid_timestamp_is_unknown():
    assert classify_freshness("not-a-date", now=NOW) == "unknown"

def test_naive_and_aware_timestamps_are_comparable():
    naive = parse_timestamp("2026-10-19T12:00:00")
    aware = parse_timestamp("2026-10-19T17:30:00+05:30")
    assert naive == aware
    assert classify_freshness("2026-10-19T12:00:00", now=NOW) == "fresh"

def test_exactly_48_hours_is_fresh():
    assert classify_freshness(NOW - timedelta(hours=48), now=NOW, freshness_hours=48) == "fresh"

def test_future_timestamp_is_unknown():
    assert classify_freshness("2026-10-20T10:00:00+05:30", now=NOW) == "unknown"

def test_fields_contain_status_age_and_current_flag():
    data = freshness_fields("2026-10-19T13:00:00Z", now=NOW, freshness_hours=48)
    assert data["freshness_status"] == "fresh"
    assert data["is_current"] is True
    assert data["freshness_hours"] == 48
    assert data["observation_age_hours"] == pytest.approx(1)

def test_negative_threshold_is_rejected():
    with pytest.raises(ValueError):
        classify_freshness("2026-10-19T13:00:00Z", now=NOW, freshness_hours=-1)
