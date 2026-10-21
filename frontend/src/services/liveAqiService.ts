// import { apiClient } from './apiClient';


// import type {
//   LiveObservationListResponse,
//   LiveRefreshParams,
//   LiveRefreshResponse,
// } from '../types/liveAqi';

// export interface LiveObservationFilters {
//   city?: string;
//   pollutantId?: string;
//   limit?: number;
//   offset?: number;
// }

// export async function fetchLiveObservations(
//   filters: LiveObservationFilters = {},
// ): Promise<LiveObservationListResponse> {
//   const response = await apiClient.get<LiveObservationListResponse>(
//     '/live-aqi/observations',
//     {
//       params: {
//         city: filters.city || undefined,
//         pollutant_id: filters.pollutantId || undefined,
//         limit: filters.limit ?? 100,
//         offset: filters.offset ?? 0,
//       },
//     },
//   );

//   return response.data;
// }

// export async function refreshLiveObservations(
//   params: LiveRefreshParams,
// ): Promise<LiveRefreshResponse> {
//   const response = await apiClient.post<LiveRefreshResponse>(
//     '/live-aqi/refresh',
//     undefined,
//     {
//       params: {
//         limit: params.limit,
//         city: params.city,
//         parameter: params.parameter,
//         start: params.start,
//         end: params.end,
//         agg: params.agg,
//       },
//     },
//   );

//   return response.data;
// }

import { apiClient } from './apiClient';
import type {
  LiveObservationListResponse,
  LiveRefreshParams,
  LiveRefreshResponse,
} from '../types/liveAqi';

export interface LiveObservationFilters {
  city?: string;
  pollutantId?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

export async function fetchLiveObservations(
  filters: LiveObservationFilters = {},
): Promise<LiveObservationListResponse> {
  const response = await apiClient.get<LiveObservationListResponse>(
    '/live-aqi/observations',
    {
      params: {
        city: filters.city || undefined,
        pollutant_id: filters.pollutantId || undefined,
        start: filters.start || undefined,
        end: filters.end || undefined,
        limit: filters.limit ?? 100,
        offset: filters.offset ?? 0,
      },
    },
  );
  return response.data;
}

export async function refreshLiveObservations(
  params: LiveRefreshParams,
): Promise<LiveRefreshResponse> {
  const response = await apiClient.post<LiveRefreshResponse>(
    '/live-aqi/refresh',
    undefined,
    {
      params: {
        limit: params.limit,
        city: params.city,
        parameter: params.parameter,
        state: params.state || undefined,
        latitude: params.latitude,
        longitude: params.longitude,
        radius_meters: params.radiusMeters ?? 25000,
      },
    },
  );
  return response.data;
}
