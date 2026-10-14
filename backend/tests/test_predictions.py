import pytest
from backend.app.core.config import settings

def test_valid_automatic_prediction(client):
    payload = {
        "city": "Delhi",
        "horizon": "next_day",
        "mode": "automatic"
    }
    response = client.post("/api/v1/aqi/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["city"] == "Delhi"
    assert "predictedAqi" in data
    assert "referenceAqi" in data
    assert "category" in data
    assert "trend" in data
    assert "riskLevel" in data
    assert len(data["forecastSeries"]) == 1
    assert data["metadata"]["is_demo"] is True
    assert data["metadata"]["data_source"] == "demo"

def test_valid_advanced_prediction(client):
    payload = {
        "city": "Mumbai",
        "horizon": "next_3_days",
        "mode": "advanced",
        "features": {
            "pm25": 120.5,
            "pm10": 210.0,
            "wind_speed": 18.0,
            "temperature": 29.0
        }
    }
    response = client.post("/api/v1/aqi/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["city"] == "Mumbai"
    assert len(data["forecastSeries"]) == 3
    assert data["confidenceInterval"] is not None

def test_invalid_prediction_missing_city(client):
    payload = {
        "horizon": "next_day",
        "mode": "automatic"
    }
    response = client.post("/api/v1/aqi/predict", json=payload)
    assert response.status_code == 422

def test_invalid_prediction_negative_pollutant(client):
    payload = {
        "city": "Pune",
        "horizon": "next_day",
        "mode": "advanced",
        "features": {
            "pm25": -50.0  # Invalid negative
        }
    }
    response = client.post("/api/v1/aqi/predict", json=payload)
    assert response.status_code == 422
