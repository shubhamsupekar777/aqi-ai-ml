import { AQICategory, RiskLevel, TrendDirection } from '../lib/aqi';

export type { AQICategory, RiskLevel, TrendDirection };

export interface City {
  id: string;
  name: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface PollutantBreakdown {
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  nh3?: number;
  no?: number;
  nox?: number;
  benzene?: number;
  toluene?: number;
  xylene?: number;
}

export interface WeatherFeatures {
  temperature: number; // Celsius
  humidity: number; // %
  windSpeed: number; // km/h
  windDirection?: number; // degrees
  precipitation?: number; // mm
  surfacePressure?: number; // hPa
}

export interface HistoricalAQIPoint {
  date: string;
  aqi: number;
  category: AQICategory;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  originalCategory?: string;
}

export interface ForecastAQIPoint {
  date: string;
  predictedAqi: number;
  category: AQICategory;
  confidenceLower?: number;
  confidenceUpper?: number;
  isForecast: boolean;
}
