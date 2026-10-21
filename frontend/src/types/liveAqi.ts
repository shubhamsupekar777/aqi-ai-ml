// export interface LiveObservation {
//   id: number;
//   country: string;
//   state: string | null;
//   city: string;
//   station: string;
//   station_id: string | null;
//   last_update: string;
//   observed_at: string | null;
//   latitude: number | null;
//   longitude: number | null;
//   pollutant_id: string;
//   unit: string | null;
//   value: number | null;
//   min_value: number | null;
//   max_value: number | null;
//   avg_value: number | null;
//   sample_count: number | null;
//   aggregation: string;
//   source: string;
//   fetched_at: string;
// }

// export interface LiveObservationListResponse {
//   source: string;
//   city_filter: string | null;
//   pollutant_filter: string | null;
//   total: number;
//   limit: number;
//   offset: number;
//   retrieved_at: string;
//   records: LiveObservation[];
// }

// export interface LiveRefreshResponse {
//   success: boolean;
//   source: string;
//   city_filter: string | null;
//   state_filter: string | null;
//   pollutant_filter: string | null;
//   start_date: string;
//   end_date: string;
//   aggregation: string;
//   requested_limit: number;
//   received: number;
//   inserted: number;
//   updated: number;
//   skipped: number;
//   truncated: boolean;
//   dataset_exported_at: string | null;
//   dataset_last_month: string | null;
//   refreshed_at: string;
//   message: string;
//   records: LiveObservation[];
// }

// export interface LiveRefreshParams {
//   city: string;
//   parameter: string;
//   start: string;
//   end: string;
//   agg: 'raw' | 'hourly' | 'daily';
//   limit: number;
// }

export interface LiveObservation {
  id: number;
  country: string;
  state: string | null;
  city: string;
  station: string;
  station_id: string | null;
  last_update: string;
  observed_at: string | null;
  latitude: number | null;
  longitude: number | null;
  pollutant_id: string;
  unit: string | null;
  value: number | null;
  min_value: number | null;
  max_value: number | null;
  avg_value: number | null;
  sample_count: number | null;
  aggregation: string;
  source: string;
  fetched_at: string;
}

export interface LiveObservationListResponse {
  source: string;
  city_filter: string | null;
  pollutant_filter: string | null;
  total: number;
  limit: number;
  offset: number;
  retrieved_at: string;
  records: LiveObservation[];
}

export interface LiveRefreshResponse {
  success: boolean;
  source: string;
  city_filter: string;
  state_filter: string | null;
  pollutant_filter: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  requested_limit: number;
  locations_checked: number;
  received: number;
  inserted: number;
  updated: number;
  skipped: number;
  latest_observation_at: string | null;
  refreshed_at: string;
  message: string;
  records: LiveObservation[];
}

export interface LiveRefreshParams {
  city: string;
  parameter: string;
  limit: number;
  state?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
}
