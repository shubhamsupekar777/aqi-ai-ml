
from typing import Tuple, List


def get_epa_category(aqi: float) -> Tuple[str, str, str, str]:
    """
    Classify AQI using the six-tier US EPA category scheme.

    Returns:
        (category_name, color, health_statement, cautionary_statement)
    """
    val = round(max(0.0, aqi))

    if val <= 50:
        return (
            "Good",
            "#10B981",
            "Air quality is satisfactory and poses minimal or no health risk.",
            "Ideal for all physical and outdoor activities.",
        )
    elif val <= 100:
        return (
            "Moderate",
            "#F59E0B",
            "Air quality is acceptable; slight concern for unusually sensitive individuals.",
            "Unusually sensitive individuals should consider limiting prolonged outdoor exertion.",
        )
    elif val <= 150:
        return (
            "Unhealthy for Sensitive Groups",
            "#F97316",
            "Sensitive groups may experience health effects; the general public is less affected.",
            "Children, older adults, and individuals with heart or lung disease should reduce heavy exertion.",
        )
    elif val <= 200:
        return (
            "Unhealthy",
            "#EF4444",
            "Everyone may begin to experience health effects, with more serious effects for sensitive groups.",
            "Avoid prolonged outdoor exertion. Consider appropriate respiratory protection in heavily polluted areas.",
        )
    elif val <= 300:
        return (
            "Very Unhealthy",
            "#8B5CF6",
            "Health alert: significant health risk for everyone in the area.",
            "Remain indoors when possible, keep windows closed during polluted periods, and use suitable air filtration.",
        )
    else:
        return (
            "Hazardous",
            "#881337",
            "Emergency health warning: serious adverse effects may occur across the population.",
            "Minimize outdoor exposure and follow local public-health advisories.",
        )


def get_cpcb_category(aqi: float) -> Tuple[str, str, str, str]:
    """
    Classify AQI using the Indian CPCB category ranges used by this project.

    Returns:
        (category_name, color, health_statement, cautionary_statement)

    Category ranges:
        0-50:   Good
        51-100: Satisfactory
        101-200: Moderate
        201-300: Poor
        301-400: Very Poor
        Above 400: Severe
    """
    val = round(max(0.0, aqi))

    if val <= 50:
        return (
            "Good",
            "#10B981",
            "Good air quality with minimal health concern.",
            "Normal outdoor activities are generally suitable.",
        )
    elif val <= 100:
        return (
            "Satisfactory",
            "#84CC16",
            "Air quality is satisfactory, with minor concerns for unusually sensitive individuals.",
            "Most people can continue normal outdoor activities.",
        )
    elif val <= 200:
        return (
            "Moderate",
            "#F59E0B",
            "Air quality may cause breathing discomfort to sensitive individuals.",
            "Sensitive individuals should consider reducing prolonged or strenuous outdoor exertion.",
        )
    elif val <= 300:
        return (
            "Poor",
            "#F97316",
            "Air quality may cause breathing discomfort to many people during prolonged exposure.",
            "Reduce prolonged outdoor exposure and strenuous activities.",
        )
    elif val <= 400:
        return (
            "Very Poor",
            "#EF4444",
            "Prolonged exposure to very poor air quality may cause respiratory effects.",
            "Limit outdoor exposure and follow local air-quality advisories.",
        )
    else:
        return (
            "Severe",
            "#881337",
            "Severe air pollution may affect healthy people and cause serious impacts for sensitive groups.",
            "Minimize outdoor exposure and follow official public-health advisories.",
        )


def get_risk_assessment(
    aqi: float,
) -> Tuple[str, str, str, str, List[str]]:
    """
    Assess pollution exposure risk using the project's AQI-based rules.

    Returns:
        (risk_level, color, title, summary, precautions)
    """
    val = round(max(0.0, aqi))

    if val <= 50:
        return (
            "Low Risk",
            "#10B981",
            "Optimal Ambient Conditions",
            "Air quality levels pose no significant health threats to the general population.",
            [
                "Outdoor recreation and physical activity are generally suitable.",
                "Ventilate indoor spaces when outdoor air quality is good.",
                "No special air-quality precautions are generally needed.",
            ],
        )
    elif val <= 100:
        return (
            "Moderate Risk",
            "#F59E0B",
            "Acceptable Air Quality — Minor Sensitivity Alert",
            "Air pollution levels may be a concern for unusually sensitive individuals.",
            [
                "Sensitive individuals should monitor symptoms during prolonged outdoor activity.",
                "Check local air-quality updates when planning outdoor activities.",
                "Most people may continue their normal outdoor routines.",
            ],
        )
    elif val <= 200:
        return (
            "High Risk",
            "#EF4444",
            "Elevated Pollution — Exposure Caution",
            "Elevated air pollution may increase respiratory discomfort, particularly in sensitive groups.",
            [
                "Children, older adults, and people with heart or lung conditions should consider reducing strenuous outdoor activity.",
                "Consider a well-fitting respirator when outdoor exposure cannot be avoided.",
                "Use suitable indoor air filtration if available.",
                "Avoid prolonged strenuous outdoor exercise when air quality is poor.",
            ],
        )
    else:
        return (
            "Severe Risk",
            "#881337",
            "Severe Pollution Episode — Exposure Warning",
            "High pollution levels may pose substantial health concerns, particularly during prolonged exposure.",
            [
                "Minimize outdoor exposure and strenuous physical activity.",
                "Keep windows closed when outdoor air quality is poor.",
                "Use suitable indoor air filtration if available.",
                "Follow official air-quality and public-health advisories.",
                "Seek medical advice if you experience serious or persistent breathing symptoms.",
            ],
        )


def determine_trend(
    current_aqi: float,
    future_aqi: float,
    threshold: float = 3.0,
) -> Tuple[str, float, float, str]:
    """
    Determine AQI trend from a reference value and predicted value.

    Returns:
        (trend_direction, delta, percentage_change, explanation)
    """
    delta = round(future_aqi - current_aqi, 1)

    pct = round(
        (delta / current_aqi * 100) if current_aqi > 0 else 0.0,
        1,
    )

    if abs(delta) <= threshold:
        return (
            "Stable",
            delta,
            pct,
            (
                f"Projected variance ({'+' if delta > 0 else ''}{delta} AQI) "
                f"is within the stability threshold (±{threshold} AQI). "
                "Trend is classified as Stable."
            ),
        )
    elif delta > 0:
        return (
            "Increasing",
            delta,
            pct,
            (
                f"Forecast values project an increase of +{delta} AQI "
                f"(+{pct}%) across the horizon. "
                "The system classifies this trajectory as Increasing."
            ),
        )
    else:
        return (
            "Decreasing",
            delta,
            pct,
            (
                f"Forecast values project a decrease of {delta} AQI "
                f"({pct}%) across the horizon. "
                "The system classifies this trajectory as Decreasing."
            ),
        )




# from typing import Tuple, Dict, Any, List

# def get_epa_category(aqi: float) -> Tuple[str, str, str, str]:
#     """
#     Returns (category_name, color, health_statement, cautionary_statement)
#     under the 6-tier US EPA scheme.
#     """
#     val = round(max(0.0, aqi))
#     if val <= 50:
#         return (
#             "Good",
#             "#10B981",
#             "Air quality is satisfactory and poses minimal or no health risk.",
#             "Ideal for all physical and outdoor activities."
#         )
#     elif val <= 100:
#         return (
#             "Moderate",
#             "#F59E0B",
#             "Air quality is acceptable; slight concern for unusually sensitive individuals.",
#             "Unusually sensitive individuals should consider limiting prolonged outdoor exertion."
#         )
#     elif val <= 150:
#         return (
#             "Unhealthy for Sensitive Groups",
#             "#F97316",
#             "Sensitive groups may experience health effects; general public is less affected.",
#             "Children, older adults, and individuals with heart/lung disease should reduce heavy exertion."
#         )
#     elif val <= 200:
#         return (
#             "Unhealthy",
#             "#EF4444",
#             "Everyone may begin to experience health effects; sensitive groups more serious effects.",
#             "Avoid prolonged outdoor exertion. Wear N95 masks in high traffic corridors."
#         )
#     elif val <= 300:
#         return (
#             "Very Unhealthy",
#             "#8B5CF6",
#             "Health alert: significant health risk for everyone in the area.",
#             "Remain indoors, keep windows closed, run HEPA air filtration."
#         )
#     else:
#         return (
#             "Hazardous",
#             "#881337",
#             "Emergency health warning: serious adverse symptoms across whole population.",
#             "Stay indoors completely, seal doors/windows, suspend non-essential travel."
#         )
        
#         def get_cpcb_category(aqi: float):
#      """Classify AQI using Indian CPCB category ranges."""
#     val = round(max(0.0, aqi))

#     if val <= 50:
#         return ("Good", "#10B981", "Good air quality.", "Normal outdoor activities.")
#     elif val <= 100:
#         return ("Satisfactory", "#84CC16", "Satisfactory air quality.", "Normal outdoor activities.")
#     elif val <= 200:
#         return ("Moderate", "#F59E0B", "Moderate air quality.", "Sensitive individuals should take precautions.")
#     elif val <= 300:
#         return ("Poor", "#F97316", "Poor air quality.", "Reduce prolonged outdoor exertion.")
#     elif val <= 400:
#         return ("Very Poor", "#EF4444", "Very poor air quality.", "Limit outdoor exposure.")
#     else:
#         return ("Severe", "#881337", "Severe air quality.", "Minimize outdoor exposure.")

# def get_risk_assessment(aqi: float) -> Tuple[str, str, str, str, List[str]]:
#     """
#     Returns (risk_level, color, title, summary, precautions)
#     """
#     val = round(max(0.0, aqi))
#     if val <= 50:
#         return (
#             "Low Risk",
#             "#10B981",
#             "Optimal Ambient Conditions",
#             "Air quality levels pose no significant health threats to the general populace.",
#             [
#                 "Safe for all outdoor recreation, sports, and athletic training.",
#                 "Ventilate indoor spaces with fresh outdoor air.",
#                 "No personal protective equipment required."
#             ]
#         )
#     elif val <= 100:
#         return (
#             "Moderate Risk",
#             "#F59E0B",
#             "Acceptable Air Quality — Minor Sensitivity Alert",
#             "Particulate matter concentrations are elevated but acceptable for most individuals.",
#             [
#                 "Unusually sensitive individuals should monitor outdoor exertion duration.",
#                 "Keep windows closed during early morning rush hour hours.",
#                 "General public may continue normal outdoor routines."
#             ]
#         )
#     elif val <= 200:
#         return (
#             "High Risk",
#             "#EF4444",
#             "Significant Health Hazard — Widespread Exposure Warning",
#             "Elevated fine particulates (PM2.5/PM10) pose imminent respiratory irritation.",
#             [
#                 "Vulnerable groups (asthmatics, seniors, toddlers) must avoid outdoor exposure.",
#                 "Wear certified N95 or KN95 respirators if traveling through congested corridors.",
#                 "Run indoor HEPA filtration units continuously on moderate fan speeds.",
#                 "Avoid strenuous outdoor workouts and heavy cardio exercise."
#             ]
#         )
#     else:
#         return (
#             "Severe Risk",
#             "#881337",
#             "Emergency Pollution Episode — Severe Public Health Advisory",
#             "Toxic particulate accumulation requires protective containment measures.",
#             [
#                 "Remain entirely indoors; seal windows, vents, and draft gaps.",
#                 "Run commercial-grade particulate air filtration at maximum capacity.",
#                 "Suspension of all outdoor activities, school recess, and outdoor events.",
#                 "Seek medical evaluation immediately if experiencing tightness of chest or wheezing."
#             ]
#         )

# def determine_trend(current_aqi: float, future_aqi: float, threshold: float = 3.0) -> Tuple[str, float, float, str]:
#     """
#     Returns (trend_direction, delta, percentage_change, explanation)
#     """
#     delta = round(future_aqi - current_aqi, 1)
#     pct = round((delta / current_aqi * 100) if current_aqi > 0 else 0.0, 1)
    
#     if abs(delta) <= threshold:
#         return (
#             "Stable",
#             delta,
#             pct,
#             f"Projected variance ({'+' if delta > 0 else ''}{delta} AQI) is within the stability threshold (±{threshold} AQI). Trend is classified as Stable."
#         )
#     elif delta > 0:
#         return (
#             "Increasing",
#             delta,
#             pct,
#             f"Forecast values project an increase of +{delta} AQI (+{pct}%) across the horizon. The system classifies this trajectory as Increasing."
#         )
#     else:
#         return (
#             "Decreasing",
#             delta,
#             pct,
#             f"Forecast values project a decrease of {delta} AQI ({pct}%) across the horizon. The system classifies this trajectory as Decreasing."
#         )
