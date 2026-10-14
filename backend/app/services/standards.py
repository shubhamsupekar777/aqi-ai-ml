from typing import Tuple, Dict, Any, List

def get_epa_category(aqi: float) -> Tuple[str, str, str, str]:
    """
    Returns (category_name, color, health_statement, cautionary_statement)
    under the 6-tier US EPA scheme.
    """
    val = round(max(0.0, aqi))
    if val <= 50:
        return (
            "Good",
            "#10B981",
            "Air quality is satisfactory and poses minimal or no health risk.",
            "Ideal for all physical and outdoor activities."
        )
    elif val <= 100:
        return (
            "Moderate",
            "#F59E0B",
            "Air quality is acceptable; slight concern for unusually sensitive individuals.",
            "Unusually sensitive individuals should consider limiting prolonged outdoor exertion."
        )
    elif val <= 150:
        return (
            "Unhealthy for Sensitive Groups",
            "#F97316",
            "Sensitive groups may experience health effects; general public is less affected.",
            "Children, older adults, and individuals with heart/lung disease should reduce heavy exertion."
        )
    elif val <= 200:
        return (
            "Unhealthy",
            "#EF4444",
            "Everyone may begin to experience health effects; sensitive groups more serious effects.",
            "Avoid prolonged outdoor exertion. Wear N95 masks in high traffic corridors."
        )
    elif val <= 300:
        return (
            "Very Unhealthy",
            "#8B5CF6",
            "Health alert: significant health risk for everyone in the area.",
            "Remain indoors, keep windows closed, run HEPA air filtration."
        )
    else:
        return (
            "Hazardous",
            "#881337",
            "Emergency health warning: serious adverse symptoms across whole population.",
            "Stay indoors completely, seal doors/windows, suspend non-essential travel."
        )

def get_risk_assessment(aqi: float) -> Tuple[str, str, str, str, List[str]]:
    """
    Returns (risk_level, color, title, summary, precautions)
    """
    val = round(max(0.0, aqi))
    if val <= 50:
        return (
            "Low Risk",
            "#10B981",
            "Optimal Ambient Conditions",
            "Air quality levels pose no significant health threats to the general populace.",
            [
                "Safe for all outdoor recreation, sports, and athletic training.",
                "Ventilate indoor spaces with fresh outdoor air.",
                "No personal protective equipment required."
            ]
        )
    elif val <= 100:
        return (
            "Moderate Risk",
            "#F59E0B",
            "Acceptable Air Quality — Minor Sensitivity Alert",
            "Particulate matter concentrations are elevated but acceptable for most individuals.",
            [
                "Unusually sensitive individuals should monitor outdoor exertion duration.",
                "Keep windows closed during early morning rush hour hours.",
                "General public may continue normal outdoor routines."
            ]
        )
    elif val <= 200:
        return (
            "High Risk",
            "#EF4444",
            "Significant Health Hazard — Widespread Exposure Warning",
            "Elevated fine particulates (PM2.5/PM10) pose imminent respiratory irritation.",
            [
                "Vulnerable groups (asthmatics, seniors, toddlers) must avoid outdoor exposure.",
                "Wear certified N95 or KN95 respirators if traveling through congested corridors.",
                "Run indoor HEPA filtration units continuously on moderate fan speeds.",
                "Avoid strenuous outdoor workouts and heavy cardio exercise."
            ]
        )
    else:
        return (
            "Severe Risk",
            "#881337",
            "Emergency Pollution Episode — Severe Public Health Advisory",
            "Toxic particulate accumulation requires protective containment measures.",
            [
                "Remain entirely indoors; seal windows, vents, and draft gaps.",
                "Run commercial-grade particulate air filtration at maximum capacity.",
                "Suspension of all outdoor activities, school recess, and outdoor events.",
                "Seek medical evaluation immediately if experiencing tightness of chest or wheezing."
            ]
        )

def determine_trend(current_aqi: float, future_aqi: float, threshold: float = 3.0) -> Tuple[str, float, float, str]:
    """
    Returns (trend_direction, delta, percentage_change, explanation)
    """
    delta = round(future_aqi - current_aqi, 1)
    pct = round((delta / current_aqi * 100) if current_aqi > 0 else 0.0, 1)
    
    if abs(delta) <= threshold:
        return (
            "Stable",
            delta,
            pct,
            f"Projected variance ({'+' if delta > 0 else ''}{delta} AQI) is within the stability threshold (±{threshold} AQI). Trend is classified as Stable."
        )
    elif delta > 0:
        return (
            "Increasing",
            delta,
            pct,
            f"Forecast values project an increase of +{delta} AQI (+{pct}%) across the horizon. The system classifies this trajectory as Increasing."
        )
    else:
        return (
            "Decreasing",
            delta,
            pct,
            f"Forecast values project a decrease of {delta} AQI ({pct}%) across the horizon. The system classifies this trajectory as Decreasing."
        )
