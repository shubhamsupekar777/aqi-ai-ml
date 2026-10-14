import { OverviewResponse } from '../types/overview';
import { getCategoryDefinition, determineTrendDirection } from '../lib/aqi';
import { CITY_BASE_AQI } from './cities';

export function getMockOverviewData(cityName: string = 'Delhi'): OverviewResponse {
  const cityProfile = CITY_BASE_AQI[cityName] || CITY_BASE_AQI['Delhi'];
  const currentAqi = cityProfile.current;
  const predNextDay = cityProfile.predNextDay;
  const currentCategory = getCategoryDefinition(currentAqi).category;
  const trendInfo = determineTrendDirection(currentAqi, predNextDay);

  // Generate 14 days of realistic historical points
  const today = new Date();
  const historicalSeries = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    const dateStr = d.toISOString().split('T')[0];
    // Deterministic wave around base AQI
    const offset = Math.round(Math.sin(i * 0.7) * 22 + (i * 1.5) - 10);
    const aqiVal = Math.max(25, currentAqi + offset);
    return {
      date: dateStr,
      aqi: aqiVal,
      category: getCategoryDefinition(aqiVal).category,
      pm25: Math.round(aqiVal * 0.62),
      pm10: Math.round(aqiVal * 1.15),
      no2: Math.round(28 + (i % 6) * 4),
      so2: Math.round(14 + (i % 4) * 2.5),
      co: parseFloat((0.8 + (aqiVal / 180)).toFixed(1)),
      o3: Math.round(35 + (i % 5) * 5)
    };
  });

  // Calculate average of the 14 days
  const avgAqi = Math.round(historicalSeries.reduce((acc, cur) => acc + cur.aqi, 0) / historicalSeries.length);

  // 7-day predicted comparison series
  const predictedComparisonSeries = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 3 + i);
    const dateStr = d.toISOString().split('T')[0];
    const isPast = i <= 3;
    const actual = isPast ? historicalSeries[historicalSeries.length - 4 + i]?.aqi : undefined;
    const predicted = Math.round(currentAqi + (i - 3) * (trendInfo.delta / 3) + Math.sin(i) * 5);
    return {
      date: dateStr,
      actualAqi: actual,
      predictedAqi: predicted,
      category: getCategoryDefinition(predicted).category
    };
  });

  return {
    city: cityName,
    kpis: {
      currentAqi,
      currentCategory,
      historicalAverageAqi: avgAqi,
      predictedNextDayAqi: predNextDay,
      trend: trendInfo.direction,
      trendDelta: trendInfo.delta,
      highRiskLocationsCount: currentAqi > 100 ? 14 : 3
    },
    historicalSeries,
    predictedComparisonSeries,
    pollutantBreakdown: {
      pm25: Math.round(currentAqi * 0.65),
      pm10: Math.round(currentAqi * 1.2),
      no2: 44.5,
      so2: 18.2,
      co: 1.4,
      o3: 42.0,
      nh3: 21.0,
      no: 19.8,
      nox: 38.6
    },
    cityComparisons: [
      { city: 'Delhi', aqi: 185, category: 'Unhealthy', dominantPollutant: 'PM2.5', trend: 'Increasing' },
      { city: 'Hyderabad', aqi: 115, category: 'Unhealthy for Sensitive Groups', dominantPollutant: 'PM2.5', trend: 'Increasing' },
      { city: 'Mumbai', aqi: 92, category: 'Moderate', dominantPollutant: 'PM10', trend: 'Decreasing' },
      { city: 'Pune', aqi: 78, category: 'Moderate', dominantPollutant: 'O3', trend: 'Stable' },
      { city: 'Chennai', aqi: 65, category: 'Moderate', dominantPollutant: 'SO2', trend: 'Decreasing' },
      { city: 'Bengaluru', aqi: 48, category: 'Good', dominantPollutant: 'NO2', trend: 'Stable' }
    ],
    categoryDistribution: [
      { category: 'Good', count: 4, percentage: 14.3, color: '#10B981' },
      { category: 'Moderate', count: 11, percentage: 39.3, color: '#F59E0B' },
      { category: 'Unhealthy for Sensitive Groups', count: 7, percentage: 25.0, color: '#F97316' },
      { category: 'Unhealthy', count: 5, percentage: 17.9, color: '#EF4444' },
      { category: 'Very Unhealthy', count: 1, percentage: 3.5, color: '#8B5CF6' },
      { category: 'Hazardous', count: 0, percentage: 0, color: '#881337' }
    ],
    recentPredictions: [
      {
        id: 'pred-101',
        city: 'Delhi',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        referenceAqi: 185,
        predictedAqi: 205,
        horizon: 'Next Day',
        category: 'Very Unhealthy',
        trend: 'Increasing',
        risk: 'Severe Risk',
        isDemo: true
      },
      {
        id: 'pred-102',
        city: 'Mumbai',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        referenceAqi: 92,
        predictedAqi: 88,
        horizon: 'Next 3 Days',
        category: 'Moderate',
        trend: 'Decreasing',
        risk: 'Moderate Risk',
        isDemo: true
      },
      {
        id: 'pred-103',
        city: 'Bengaluru',
        timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        referenceAqi: 48,
        predictedAqi: 52,
        horizon: 'Next 7 Days',
        category: 'Moderate',
        trend: 'Stable',
        risk: 'Low Risk',
        isDemo: true
      }
    ],
    warnings: [
      {
        id: 'warn-1',
        severity: currentAqi > 150 ? 'high' : 'moderate',
        title: `${cityName} Particulate Alert`,
        message: currentAqi > 150 
          ? `Thermal inversion and stagnation elevate PM2.5 concentrations in ${cityName}. Children and seniors should remain indoors.`
          : `Mild particulate buildup anticipated during evening peak traffic corridors across ${cityName}.`,
        city: cityName,
        timestamp: new Date().toISOString()
      }
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
