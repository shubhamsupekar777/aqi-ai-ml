import { AQICategory, TrendDirection } from './aqi';
import { ApiResponseMetadata } from './api';

export interface TrendDataPoint {
  date: string;
  aqi: number;
  category?: AQICategory;
  isForecast: boolean;
  lowerBound?: number;
  upperBound?: number;
}

export interface TrendForecastRequest {
  city: string;
  horizonDays?: number;
}

export interface TrendResponse {
  city: string;
  referenceAqi: number;
  currentCategory: AQICategory;
  trendDirection: TrendDirection;
  delta: number;
  percentageChange: number;
  horizonDays: number;
  calculationMethod: string;
  explanation: string;
  historicalSeries: TrendDataPoint[];
  forecastSeries: TrendDataPoint[];
  combinedSeries: TrendDataPoint[];
  metadata: ApiResponseMetadata;
}
