import pytest

def test_classification_boundaries(client):
    test_cases = [
        (35.0, "Good"),
        (50.0, "Good"),
        (51.0, "Moderate"),
        (100.0, "Moderate"),
        (101.0, "Unhealthy for Sensitive Groups"),
        (150.0, "Unhealthy for Sensitive Groups"),
        (151.0, "Unhealthy"),
        (200.0, "Unhealthy"),
        (201.0, "Very Unhealthy"),
        (300.0, "Very Unhealthy"),
        (301.0, "Hazardous"),
        (450.0, "Hazardous"),
    ]

    for aqi_val, expected_cat in test_cases:
        res = client.post("/api/v1/aqi/classify", json={"aqi": aqi_val, "scheme": "US_EPA"})
        assert res.status_code == 200
        data = res.json()
        assert data["category"] == expected_cat, f"AQI {aqi_val} expected {expected_cat}, got {data['category']}"
        assert data["probabilities"] is None  # Must not fabricate confidence
        assert "healthStatement" in data
        assert "cautionaryStatement" in data

def test_invalid_classification_out_of_range(client):
    res = client.post("/api/v1/aqi/classify", json={"aqi": -10.0})
    assert res.status_code == 422

    res2 = client.post("/api/v1/aqi/classify", json={"aqi": 1500.0})
    assert res2.status_code == 422
