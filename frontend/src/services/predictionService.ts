

import { apiClient, isMockMode } from './apiClient';
import { ENDPOINTS } from './endpoints';

import type {
  AdvancedFeaturesInput,
  PredictionRequest,
  PredictionResponse,
} from '../types/prediction';

import { generateMockPrediction } from '../mocks/predictions';
import { getMockOverviewData } from '../mocks/overview';

export interface PredictionFeatureDefaults {
  city: string;
  observationDate: string;
  source: string;
  features: {
    pm25: number | null;
    pm10: number | null;
    no2: number | null;
    so2: number | null;
    co: number | null;
    o3: number | null;
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
    rainfall: number | null;
  };
}

/**
 * Fetch stored feature values for Advanced Mode.
 *
 * API mode:
 * Values come from the backend and PostgreSQL.
 *
 * Mock mode:
 * Values come from the existing mock overview data.
 */
export async function fetchPredictionFeatureDefaults(
  city: string,
): Promise<PredictionFeatureDefaults> {
  if (isMockMode()) {
    const overview = getMockOverviewData(city);
    const latest =
      overview.historicalSeries[overview.historicalSeries.length - 1];

    const latestWithWeather = latest as typeof latest & {
      temperature?: number | null;
      humidity?: number | null;
      windSpeed?: number | null;
      rainfall?: number | null;
    };

    return {
      city,
      observationDate: latest?.date ?? 'mock data',
      source: 'mock',
      features: {
        pm25: overview.pollutantBreakdown.pm25 ?? latest?.pm25 ?? null,
        pm10: overview.pollutantBreakdown.pm10 ?? latest?.pm10 ?? null,
        no2: overview.pollutantBreakdown.no2 ?? latest?.no2 ?? null,
        so2: overview.pollutantBreakdown.so2 ?? latest?.so2 ?? null,
        co: overview.pollutantBreakdown.co ?? latest?.co ?? null,
        o3: overview.pollutantBreakdown.o3 ?? latest?.o3 ?? null,
        temperature: latestWithWeather?.temperature ?? null,
        humidity: latestWithWeather?.humidity ?? null,
        windSpeed: latestWithWeather?.windSpeed ?? null,
        rainfall: latestWithWeather?.rainfall ?? null,
      },
    };
  }

  const response = await apiClient.get<PredictionFeatureDefaults>(
    ENDPOINTS.PREDICTION_FEATURES,
    {
      params: { city },
    },
  );

  return response.data;
}

/**
 * Convert frontend camelCase field names to the snake_case names
 * accepted by the FastAPI prediction schema.
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

/**
 * Generate a prediction through either the explicitly enabled mock
 * service or the real FastAPI endpoint.
 */
export async function predictAqi(
  request: PredictionRequest,
): Promise<PredictionResponse> {
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(generateMockPrediction(request));
      }, 300);
    });
  }

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

// import type {
//   AdvancedFeaturesInput,
//   PredictionRequest,
//   PredictionResponse,
// } from '../types/prediction';

// import { generateMockPrediction } from '../mocks/predictions';

// /**
//  * Translate frontend field names into the names expected by FastAPI.
//  *
//  * Example:
//  * windSpeed -> wind_speed
//  * aqiLag1d  -> aqi_lag_1d
//  */
// const FEATURE_KEY_MAP: Record<keyof AdvancedFeaturesInput, string> = {
//   aqi: 'aqi',

//   pm25: 'pm25',
//   pm10: 'pm10',
//   no: 'no',
//   no2: 'no2',
//   nox: 'nox',
//   nh3: 'nh3',
//   co: 'co',
//   so2: 'so2',
//   o3: 'o3',
//   benzene: 'benzene',
//   toluene: 'toluene',
//   xylene: 'xylene',

//   temperature: 'temperature',
//   humidity: 'humidity',
//   windSpeed: 'wind_speed',
//   windDirection: 'wind_direction',
//   rainfall: 'rainfall',
//   surfacePressure: 'surface_pressure',

//   aqiLag1d: 'aqi_lag_1d',
//   aqiLag3d: 'aqi_lag_3d',
//   aqiLag7d: 'aqi_lag_7d',
//   aqiRollingMean7d: 'aqi_rolling_mean_7d',

//   latitude: 'latitude',
//   longitude: 'longitude',
//   dayOfWeek: 'day_of_week',
//   month: 'month',
//   season: 'season',
// };

// function toBackendFeatures(
//   features?: AdvancedFeaturesInput,
// ): Record<string, number | string> | undefined {
//   if (!features) {
//     return undefined;
//   }

//   const result: Record<string, number | string> = {};

//   for (const [key, value] of Object.entries(features)) {
//     if (value === undefined || value === null) {
//       continue;
//     }

//     const backendKey =
//       FEATURE_KEY_MAP[key as keyof AdvancedFeaturesInput];

//     if (backendKey) {
//       result[backendKey] = value;
//     }
//   }

//   return result;
// }

// export async function predictAqi(
//   request: PredictionRequest,
// ): Promise<PredictionResponse> {
//   // Keep demo fixtures available only when mock mode is explicitly enabled.
//   if (isMockMode()) {
//     return new Promise((resolve) => {
//       setTimeout(() => {
//         resolve(generateMockPrediction(request));
//       }, 300);
//     });
//   }

//   // Automatic Mode sends the city and horizon; the backend must retrieve
//   // the required features from PostgreSQL.
//   const payload = {
//     city: request.city,
//     horizon: request.horizon,
//     mode: request.mode,
//     ...(request.features
//       ? { features: toBackendFeatures(request.features) }
//       : {}),
//   };

//   const response = await apiClient.post<PredictionResponse>(
//     ENDPOINTS.PREDICT,
//     payload,
//   );

//   return response.data;
// }


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
