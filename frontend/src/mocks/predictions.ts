import { PredictionRequest, PredictionResponse } from '../types/prediction';
import { getCategoryDefinition, getRiskAssessment, determineTrendDirection } from '../lib/aqi';
import { CITY_BASE_AQI } from './cities';

export function generateMockPrediction(request: PredictionRequest): PredictionResponse {
  const cityProfile = CITY_BASE_AQI[request.city] || CITY_BASE_AQI['Delhi'];
  const referenceAqi = cityProfile.current;

  // Multipliers based on horizon
  let horizonFactor = 1.08;
  let horizonDays = 1;
  if (request.horizon === 'next_3_days') {
    horizonFactor = 1.14;
    horizonDays = 3;
  } else if (request.horizon === 'next_7_days') {
    horizonFactor = 1.22;
    horizonDays = 7;
  }

  // Adjust if advanced user features were provided
  let featureAdjustment = 0;
  if (request.mode === 'advanced' && request.features) {
    if (request.features.pm25 !== undefined) {
      featureAdjustment += (request.features.pm25 - 60) * 0.45;
    }
    if (request.features.pm10 !== undefined) {
      featureAdjustment += (request.features.pm10 - 100) * 0.25;
    }
    if (request.features.windSpeed !== undefined && request.features.windSpeed > 15) {
      // High wind disperses pollution
      featureAdjustment -= 12;
    }
    if (request.features.rainfall !== undefined && request.features.rainfall > 5) {
      // Rain washouts particles
      featureAdjustment -= 18;
    }
  }

  const rawPredicted = Math.round(referenceAqi * horizonFactor + featureAdjustment);
  const predictedAqi = Math.max(15, Math.min(500, rawPredicted));
  const categoryDef = getCategoryDefinition(predictedAqi);
  const riskInfo = getRiskAssessment(predictedAqi);
  const trendInfo = determineTrendDirection(referenceAqi, predictedAqi);

  // Forecast series for the horizon days
  const today = new Date();
  const forecastSeries = Array.from({ length: horizonDays }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + (i + 1));
    const stepAqi = Math.round(referenceAqi + ((predictedAqi - referenceAqi) / horizonDays) * (i + 1));
    return {
      date: d.toISOString().split('T')[0],
      predictedAqi: stepAqi,
      category: getCategoryDefinition(stepAqi).category,
      confidenceLower: Math.max(10, stepAqi - 12 - i * 3),
      confidenceUpper: Math.min(500, stepAqi + 14 + i * 4),
      isForecast: true
    };
  });

  return {
    city: request.city,
    referenceAqi,
    predictedAqi,
    category: categoryDef.category,
    trend: trendInfo.direction,
    riskLevel: riskInfo.level,
    horizon: request.horizon,
    predictionTimestamp: new Date().toISOString(),
    confidenceInterval: {
      lower: Math.max(10, predictedAqi - (horizonDays * 6 + 10)),
      upper: Math.min(500, predictedAqi + (horizonDays * 8 + 12))
    },
    featureDrivers: [
      { feature: 'PM2.5 (Fine Particulates)', weight: 0.42, impact: 'positive' },
      { feature: 'Wind Speed & Dispersion', weight: 0.23, impact: 'negative' },
      { feature: 'Ambient Temperature & Inversion', weight: 0.16, impact: 'positive' },
      { feature: 'PM10 (Coarse Particulates)', weight: 0.12, impact: 'positive' },
      { feature: 'Relative Humidity', weight: 0.07, impact: 'positive' }
    ],
    forecastSeries,
    explanation: `Based on deterministic demo simulation, ${request.city} AQI is projected to move from ${referenceAqi} to ${predictedAqi} over the ${request.horizon.replace('_', ' ')} window. ${trendInfo.explanation} Precautionary health risk is evaluated at ${riskInfo.level}.`,
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
