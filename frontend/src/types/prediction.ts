import { AQICategory, RiskLevel, TrendDirection, ForecastAQIPoint } from './aqi';
import { ApiResponseMetadata } from './api';

export type PredictionHorizon = 'next_day' | 'next_3_days' | 'next_7_days';
export type PredictionMode = 'automatic' | 'advanced';

export interface AdvancedFeaturesInput {
  pm25?: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  o3?: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  rainfall?: number;
}

export interface PredictionRequest {
  city: string;
  horizon: PredictionHorizon;
  mode: PredictionMode;
  features?: AdvancedFeaturesInput;
}

export interface FeatureImportance {
  feature: string;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface PredictionResponse {
  city: string;
  referenceAqi: number;
  predictedAqi: number;
  category: AQICategory;
  trend: TrendDirection;
  riskLevel: RiskLevel;
  horizon: PredictionHorizon;
  predictionTimestamp: string;
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
  featureDrivers?: FeatureImportance[];
  forecastSeries: ForecastAQIPoint[];
  explanation: string;
  metadata: ApiResponseMetadata;
}
