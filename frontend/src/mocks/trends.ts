import type { TrendResponse, TrendDataPoint } from '../types/trend';
import { determineTrendDirection } from '../lib/aqi';
import { CITY_BASE_AQI } from './cities';

const CPCB_BUCKETS = [
  { category: 'Good', min: 0, max: 50 },
  { category: 'Satisfactory', min: 51, max: 100 },
  { category: 'Moderate', min: 101, max: 200 },
  { category: 'Poor', min: 201, max: 300 },
  { category: 'Very Poor', min: 301, max: 400 },
  { category: 'Severe', min: 401, max: 500 },
];

function getCpcbCategory(aqi: number): string {
  const value = Math.max(0, Math.min(500, Math.round(aqi)));
  return CPCB_BUCKETS.find((bucket) => value >= bucket.min && value <= bucket.max)?.category ?? 'Severe';
}

/**
 * Explicitly synthetic fixture used only when VITE_DATA_MODE=mock.
 * The real Model 3 predicts a 3-day trend class, not future numerical AQI values,
 * so this mock intentionally does not create a numerical forecast curve.
 */
export function getMockTrendsData(
  cityName: string = 'Delhi',
  horizonDays: number = 3,
): TrendResponse {
  const cityProfile = CITY_BASE_AQI[cityName] || CITY_BASE_AQI['Delhi'];
  const referenceAqi = Math.max(0, Math.min(500, Number(cityProfile.current)));
  const currentCategory = getCpcbCategory(referenceAqi);
  const trendInfo = determineTrendDirection(referenceAqi, Math.round(cityProfile.predNextDay));
  const trendDirection = trendInfo.direction;
  const now = new Date();

  const historicalSeries: TrendDataPoint[] = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (13 - index));
    const offset = Math.round(Math.sin(index * 0.65) * 18 - 8 + index * 0.9);
    const aqi = Math.max(0, Math.min(500, referenceAqi + offset));

    return {
      date: date.toISOString().slice(0, 10),
      aqi,
      category: getCpcbCategory(aqi),
      isForecast: false,
    };
  });

  // Clearly marked demo vote scores; these are not real model probabilities.
  const classScores = [
    { direction: 'Increasing' as const, score: trendDirection === 'Increasing' ? 0.62 : 0.19 },
    { direction: 'Stable' as const, score: trendDirection === 'Stable' ? 0.62 : 0.19 },
    { direction: 'Decreasing' as const, score: trendDirection === 'Decreasing' ? 0.62 : 0.19 },
  ];
  const scoreTotal = classScores.reduce((sum, item) => sum + item.score, 0);
  const normalizedScores = classScores.map((item) => ({ ...item, score: item.score / scoreTotal }));

  return {
    city: cityName,
    observationDate: historicalSeries[historicalSeries.length - 1]?.date ?? null,
    referenceAqi,
    currentCategory,
    trendDirection,
    delta: null,
    percentageChange: null,
    horizonDays: 3,
    calculationMethod: 'Mock trend-direction fixture (demonstration only)',
    explanation: `This is synthetic mock output for ${cityName}. It shows a demonstration trend category only; no numerical future AQI values are predicted. Switch VITE_DATA_MODE=api to use the trained trend classifier.`,
    classScores: normalizedScores,
    historicalSeries,
    forecastSeries: [],
    combinedSeries: historicalSeries,
    metadata: {
      data_source: 'demo',
      model_status: 'not_trained',
      model_name: null,
      prediction_type: 'demo',
      is_demo: true,
      timestamp: now.toISOString(),
    },
  };
}
