
import type {
  AQICategory,
  RiskLevel,
  TrendDirection,
  ForecastAQIPoint,
} from './aqi';

import type { ApiResponseMetadata } from './api';

export type PredictionHorizon = 'next_day' | 'next_3_days';
export type PredictionMode = 'automatic' | 'advanced';

/**
 * Optional values a user can override in Advanced Mode.
 * The backend will combine these overrides with database-derived features.
 *
 * Property names here use camelCase for the React frontend.
 * predictionService.ts converts them to backend snake_case.
 */
export interface AdvancedFeaturesInput {
  aqi?: number;

  pm25?: number;
  pm10?: number;
  no?: number;
  no2?: number;
  nox?: number;
  nh3?: number;
  co?: number;
  so2?: number;
  o3?: number;
  benzene?: number;
  toluene?: number;
  xylene?: number;

  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: number;
  rainfall?: number;
  surfacePressure?: number;

  aqiLag1d?: number;
  aqiLag3d?: number;
  aqiLag7d?: number;
  aqiRollingMean7d?: number;

  latitude?: number;
  longitude?: number;
  dayOfWeek?: number;
  month?: number;
  season?: string;
}

export interface PredictionRequest {
  city: string;
  horizon: PredictionHorizon;
  mode: PredictionMode;

  /**
   * Omit in Automatic Mode.
   * In Advanced Mode, provide only the fields being overridden.
   */
  features?: AdvancedFeaturesInput;
}

export interface FeatureImportance {
  feature: string;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface PredictionResponse {
  city: string;

  /** Reference AQI used by the model. */
  referenceAqi: number;

  /** Model output for the supported forecast horizon. */
  predictedAqi: number;

  category: AQICategory;
  trend: TrendDirection;
  riskLevel: RiskLevel;
  horizon: PredictionHorizon;
  predictionTimestamp: string;

  confidenceInterval?: {
    lower: number;
    upper: number;
  } | null;

  featureDrivers?: FeatureImportance[] | null;

  forecastSeries: ForecastAQIPoint[];
  explanation: string;
  metadata: ApiResponseMetadata;
}


// import { AQICategory, RiskLevel, TrendDirection, ForecastAQIPoint } from './aqi';
// import { ApiResponseMetadata } from './api';

// export type PredictionHorizon = 'next_day' | 'next_3_days' | 'next_7_days';
// export type PredictionMode = 'automatic' | 'advanced';

// export interface AdvancedFeaturesInput {
//   pm25?: number;
//   pm10?: number;
//   no2?: number;
//   so2?: number;
//   co?: number;
//   o3?: number;
//   temperature?: number;
//   humidity?: number;
//   windSpeed?: number;
//   rainfall?: number;
// }

// export interface PredictionRequest {
//   city: string;
//   horizon: PredictionHorizon;
//   mode: PredictionMode;
//   features?: AdvancedFeaturesInput;
// }

// export interface FeatureImportance {
//   feature: string;
//   weight: number;
//   impact: 'positive' | 'negative' | 'neutral';
// }

// export interface PredictionResponse {
//   city: string;
//   referenceAqi: number;
//   predictedAqi: number;
//   category: AQICategory;
//   trend: TrendDirection;
//   riskLevel: RiskLevel;
//   horizon: PredictionHorizon;
//   predictionTimestamp: string;
//   confidenceInterval?: {
//     lower: number;
//     upper: number;
//   };
//   featureDrivers?: FeatureImportance[];
//   forecastSeries: ForecastAQIPoint[];
//   explanation: string;
//   metadata: ApiResponseMetadata;
// }
