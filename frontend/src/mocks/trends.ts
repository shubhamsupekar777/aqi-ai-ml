import { TrendResponse, TrendDataPoint } from '../types/trend';
import { getCategoryDefinition, determineTrendDirection } from '../lib/aqi';
import { CITY_BASE_AQI } from './cities';

export function getMockTrendsData(cityName: string = 'Delhi', horizonDays: number = 7): TrendResponse {
  const cityProfile = CITY_BASE_AQI[cityName] || CITY_BASE_AQI['Delhi'];
  const referenceAqi = cityProfile.current;
  const currentCategory = getCategoryDefinition(referenceAqi).category;

  const today = new Date();

  // 14 days of historical observations
  const historicalSeries: TrendDataPoint[] = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    const offset = Math.round(Math.sin(i * 0.65) * 18 - 8 + (i * 0.9));
    const val = Math.max(20, referenceAqi + offset);
    return {
      date: d.toISOString().split('T')[0],
      aqi: val,
      category: getCategoryDefinition(val).category,
      isForecast: false
    };
  });

  // Calculate projected endpoint
  // Delhi trends up, Mumbai trends down, Pune stable, etc.
  const targetAqi = cityProfile.predNextDay + (horizonDays > 3 ? (cityProfile.predNextDay - referenceAqi) * 1.5 : 0);
  const trendInfo = determineTrendDirection(referenceAqi, Math.round(targetAqi));

  // Generate forecast series
  const forecastSeries: TrendDataPoint[] = Array.from({ length: horizonDays }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + (i + 1));
    const stepAqi = Math.round(referenceAqi + ((targetAqi - referenceAqi) / horizonDays) * (i + 1));
    return {
      date: d.toISOString().split('T')[0],
      aqi: stepAqi,
      category: getCategoryDefinition(stepAqi).category,
      isForecast: true,
      lowerBound: Math.max(10, stepAqi - (8 + i * 3)),
      upperBound: Math.min(500, stepAqi + (10 + i * 4))
    };
  });

  // Combine for single chart visualization
  const combinedSeries: TrendDataPoint[] = [
    ...historicalSeries,
    ...forecastSeries
  ];

  return {
    city: cityName,
    referenceAqi,
    currentCategory,
    trendDirection: trendInfo.direction,
    delta: trendInfo.delta,
    percentageChange: trendInfo.percentageChange,
    horizonDays,
    calculationMethod: 'Slope and absolute threshold variance (±3 AQI margin)',
    explanation: `Demo forecast values project a shift of ${trendInfo.delta > 0 ? '+' : ''}${trendInfo.delta.toFixed(1)} AQI (${trendInfo.percentageChange > 0 ? '+' : ''}${trendInfo.percentageChange.toFixed(1)}%) across the ${horizonDays}-day horizon. The system therefore classifies this sample trend as ${trendInfo.direction}.`,
    historicalSeries,
    forecastSeries,
    combinedSeries,
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
