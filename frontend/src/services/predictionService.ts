
import { apiClient, isMockMode } from './apiClient';
import { ENDPOINTS } from './endpoints';

import type {
  AdvancedFeaturesInput,
  PredictionRequest,
  PredictionResponse,
} from '../types/prediction';

import { generateMockPrediction } from '../mocks/predictions';

/**
 * Translate frontend field names into the names expected by FastAPI.
 *
 * Example:
 * windSpeed -> wind_speed
 * aqiLag1d  -> aqi_lag_1d
 */
const FEATURE_KEY_MAP: Record<keyof AdvancedFeaturesInput, string> = {
  aqi: 'aqi',

  pm25: 'pm25',
  pm10: 'pm10',
  no: 'no',
  no2: 'no2',
  nox: 'nox',
  nh3: 'nh3',
  co: 'co',
  so2: 'so2',
  o3: 'o3',
  benzene: 'benzene',
  toluene: 'toluene',
  xylene: 'xylene',

  temperature: 'temperature',
  humidity: 'humidity',
  windSpeed: 'wind_speed',
  windDirection: 'wind_direction',
  rainfall: 'rainfall',
  surfacePressure: 'surface_pressure',

  aqiLag1d: 'aqi_lag_1d',
  aqiLag3d: 'aqi_lag_3d',
  aqiLag7d: 'aqi_lag_7d',
  aqiRollingMean7d: 'aqi_rolling_mean_7d',

  latitude: 'latitude',
  longitude: 'longitude',
  dayOfWeek: 'day_of_week',
  month: 'month',
  season: 'season',
};

function toBackendFeatures(
  features?: AdvancedFeaturesInput,
): Record<string, number | string> | undefined {
  if (!features) {
    return undefined;
  }

  const result: Record<string, number | string> = {};

  for (const [key, value] of Object.entries(features)) {
    if (value === undefined || value === null) {
      continue;
    }

    const backendKey =
      FEATURE_KEY_MAP[key as keyof AdvancedFeaturesInput];

    if (backendKey) {
      result[backendKey] = value;
    }
  }

  return result;
}

export async function predictAqi(
  request: PredictionRequest,
): Promise<PredictionResponse> {
  // Keep demo fixtures available only when mock mode is explicitly enabled.
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(generateMockPrediction(request));
      }, 300);
    });
  }

  // Automatic Mode sends the city and horizon; the backend must retrieve
  // the required features from PostgreSQL.
  const payload = {
    city: request.city,
    horizon: request.horizon,
    mode: request.mode,
    ...(request.features
      ? { features: toBackendFeatures(request.features) }
      : {}),
  };

  const response = await apiClient.post<PredictionResponse>(
    ENDPOINTS.PREDICT,
    payload,
  );

  return response.data;
}


// import { apiClient, isMockMode } from './apiClient';
// import { ENDPOINTS } from './endpoints';
// import { PredictionRequest, PredictionResponse } from '../types/prediction';
// import { generateMockPrediction } from '../mocks/predictions';

// export async function predictAqi(request: PredictionRequest): Promise<PredictionResponse> {
//   if (isMockMode()) {
//     return new Promise((resolve) => {
//       setTimeout(() => resolve(generateMockPrediction(request)), 300);
//     });
//   }

//   const response = await apiClient.post<PredictionResponse>(ENDPOINTS.PREDICT, request);
//   return response.data;
// }
