def test_get_trends_endpoint(client):
    response = client.get("/api/v1/aqi/trends?city=Delhi&horizon_days=7")
    assert response.status_code == 200
    data = response.json()
    assert data["city"] == "Delhi"
    assert data["trendDirection"] in ["Increasing", "Decreasing", "Stable"]
    assert "delta" in data
    assert "percentageChange" in data
    assert len(data["historicalSeries"]) == 14
    assert len(data["forecastSeries"]) == 7
    assert len(data["combinedSeries"]) == 21
    assert data["metadata"]["is_demo"] is True

def test_forecast_trend_post(client):
    payload = {"city": "Mumbai", "horizonDays": 14}
    response = client.post("/api/v1/aqi/trends/forecast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["city"] == "Mumbai"
    assert len(data["forecastSeries"]) == 14
    assert "calculationMethod" in data
