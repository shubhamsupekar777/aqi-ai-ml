def test_risk_assessment_tiers(client):
    test_cases = [
        (35.0, "Low Risk"),
        (85.0, "Moderate Risk"),
        (165.0, "High Risk"),
        (260.0, "Severe Risk"),
    ]

    for aqi_val, expected_risk in test_cases:
        res = client.post("/api/v1/aqi/risk-assessment", json={"city": "Delhi", "aqi": aqi_val})
        assert res.status_code == 200
        data = res.json()
        assert data["riskClassification"] == expected_risk
        assert len(data["generalPrecautions"]) > 0
        assert len(data["demographicGuidelines"]) == 4
        assert "clinical diagnosis" in data["explanation"]
        assert data["metadata"]["is_demo"] is True
