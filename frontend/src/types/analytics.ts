import { ApiResponseMetadata } from './api';

export interface SummaryStats {
  meanAqi: number;
  medianAqi: number;
  minAqi: number;
  maxAqi: number;
  stdAqi: number;
  totalRecords: number;
  cleanAirDays: number;
  hazardDays: number;
}

export interface CorrelationCell {
  x: string;
  y: string;
  value: number;
}

export interface SeasonalPattern {
  season: string;
  averageAqi: number;
  avgPm25: number;
  avgTemp: number;
  dominantPollutant: string;
}

export interface DiurnalHourPoint {
  hour: string;
  delhi: number;
  mumbai: number;
  bengaluru: number;
  pune: number;
}

export interface CitySummary {
  city: string;
  avgAqi: number;
  maxAqi: number;
  minAqi: number;
  dominantPollutant: string;
  status: string;
}

export interface AnalyticsResponse {
  summary: SummaryStats;
  seasonalPatterns: SeasonalPattern[];
  diurnalProfile: DiurnalHourPoint[];
  correlationMatrix: CorrelationCell[];
  citySummaries: CitySummary[];
  metadata: ApiResponseMetadata;
}
