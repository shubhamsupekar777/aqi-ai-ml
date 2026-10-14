import { RiskAssessmentRequest, RiskAssessmentResponse } from '../types/risk';
import { getCategoryDefinition, getRiskAssessment } from '../lib/aqi';
import { CITY_BASE_AQI } from './cities';

export function getMockRiskData(request: RiskAssessmentRequest = {}): RiskAssessmentResponse {
  const cityName = request.city || 'Delhi';
  const cityProfile = CITY_BASE_AQI[cityName] || CITY_BASE_AQI['Delhi'];
  const aqiVal = request.aqi !== undefined ? Math.round(request.aqi) : cityProfile.current;

  const categoryDef = getCategoryDefinition(aqiVal);
  const riskInfo = getRiskAssessment(aqiVal);

  return {
    city: cityName,
    referenceAqi: aqiVal,
    category: categoryDef.category,
    riskClassification: riskInfo.level,
    ruleIdentifier: 'DEMO_MULTI_TIER_RISK_RULE_V1',
    warningTitle: riskInfo.title,
    summary: riskInfo.summary,
    explanation: `Numerical AQI value of ${aqiVal} maps to '${riskInfo.level}' under the transparent demo exposure rule mapping. This classification reflects ambient particulate matter exposure potential rather than an individual clinical diagnosis.`,
    generalPrecautions: riskInfo.advice,
    demographicGuidelines: [
      {
        group: 'General Population',
        exposureRisk: aqiVal > 150 ? 'Moderate to High' : 'Low',
        recommendation: aqiVal > 150 
          ? 'Reduce prolonged heavy physical exertion outdoors during high pollution periods.'
          : 'Normal outdoor activities and exercise are permitted.'
      },
      {
        group: 'Children & Adolescents',
        exposureRisk: aqiVal > 100 ? 'High' : 'Low to Moderate',
        recommendation: aqiVal > 100
          ? 'Limit outdoor sports and active recess; prefer ventilated indoor recreation spaces.'
          : 'Standard outdoor play permitted.'
      },
      {
        group: 'Older Adults (65+)',
        exposureRisk: aqiVal > 100 ? 'High' : 'Low to Moderate',
        recommendation: aqiVal > 100
          ? 'Avoid high-traffic roads; schedule walks during midday when ground-level particulate is lowest.'
          : 'Standard outdoor activity with hydration recommended.'
      },
      {
        group: 'Individuals with Respiratory or Cardiovascular Conditions',
        exposureRisk: aqiVal > 50 ? 'Significant Vulnerability' : 'Low',
        recommendation: aqiVal > 100
          ? 'Strictly stay indoors; keep quick-relief inhalers and prescribed medicines accessible at all times.'
          : 'Monitor symptom response and keep air filtration on.'
      }
    ],
    riskDistribution: [
      { level: 'Low Risk', count: 14, percentage: 23.3, color: '#10B981' },
      { level: 'Moderate Risk', count: 24, percentage: 40.0, color: '#F59E0B' },
      { level: 'High Risk', count: 16, percentage: 26.7, color: '#EF4444' },
      { level: 'Severe Risk', count: 6, percentage: 10.0, color: '#881337' }
    ],
    cityRiskComparison: [
      { city: 'Delhi', aqi: 185, risk: 'High Risk', color: '#EF4444' },
      { city: 'Hyderabad', aqi: 115, risk: 'High Risk', color: '#EF4444' },
      { city: 'Mumbai', aqi: 92, risk: 'Moderate Risk', color: '#F59E0B' },
      { city: 'Pune', aqi: 78, risk: 'Moderate Risk', color: '#F59E0B' },
      { city: 'Chennai', aqi: 65, risk: 'Moderate Risk', color: '#F59E0B' },
      { city: 'Bengaluru', aqi: 48, risk: 'Low Risk', color: '#10B981' }
    ],
    metadata: {
      data_source: 'demo',
      model_status: 'not_trained',
      model_name: null,
      prediction_type: 'demo',
      is_demo: true,
      timestamp: new Date().toISOString()
    }
  };
}
