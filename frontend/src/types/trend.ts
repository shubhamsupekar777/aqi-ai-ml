
import type { TrendDirection } from '../lib/aqi';
import type { ApiResponseMetadata } from './api';

export interface TrendDataPoint {
  date: string;
  aqi: number;
  category?: string | null;
  isForecast: boolean;
  lowerBound?: number | null;
  upperBound?: number | null;
}

export interface TrendClassScore {
  direction: TrendDirection;
  /** Random Forest vote score; not a calibrated probability. */
  score: number;
}

export interface TrendForecastRequest {
  city: string;
  /** The trained model supports a 3-day smoothed trend label only. */
  horizonDays?: number;
}

export interface TrendResponse {
  city: string;
  observationDate?: string | null;
  referenceAqi: number;
  currentCategory: string;
  trendDirection: TrendDirection;
  /** Null: this model predicts direction rather than a numerical AQI delta. */
  delta: number | null;
  percentageChange: number | null;
  horizonDays: number;
  calculationMethod: string;
  explanation: string;
  classScores?: TrendClassScore[] | null;
  historicalSeries: TrendDataPoint[];
  /** Empty because a trend classifier does not estimate per-day AQI values. */
  forecastSeries: TrendDataPoint[];
  combinedSeries: TrendDataPoint[];
  metadata: ApiResponseMetadata;
}

// import { AQICategory, TrendDirection } from './aqi';
// import { ApiResponseMetadata } from './api';

// export interface TrendDataPoint {
//   date: string;
//   aqi: number;
//   category?: AQICategory;
//   isForecast: boolean;
//   lowerBound?: number;
//   upperBound?: number;
// }

// export interface TrendForecastRequest {
//   city: string;
//   horizonDays?: number;
// }

// export interface TrendResponse {
//   city: string;
//   referenceAqi: number;
//   currentCategory: AQICategory;
//   trendDirection: TrendDirection;
//   delta: number;
//   percentageChange: number;
//   horizonDays: number;
//   calculationMethod: string;
//   explanation: string;
//   historicalSeries: TrendDataPoint[];
//   forecastSeries: TrendDataPoint[];
//   combinedSeries: TrendDataPoint[];
//   metadata: ApiResponseMetadata;
// }
