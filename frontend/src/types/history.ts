import { AQICategory } from './aqi';
import { ApiResponseMetadata } from './api';

export interface HistoricalFilterParams {
  city?: string;
  startDate?: string;
  endDate?: string;
  minAqi?: number;
  maxAqi?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface HistoricalRecord {
  id: string;
  city: string;
  date: string;
  aqi: number;
  category: AQICategory;
  originalCategory?: string;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  dataSource?: string;
}

export interface HistoricalDataResponse {
  items: HistoricalRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  metadata: ApiResponseMetadata;
}
