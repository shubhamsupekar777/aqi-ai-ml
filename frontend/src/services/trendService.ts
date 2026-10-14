import { apiClient, isMockMode } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { TrendResponse, TrendForecastRequest } from '../types/trend';
import { getMockTrendsData } from '../mocks/trends';

export async function fetchTrends(city: string = 'Delhi', horizonDays: number = 7): Promise<TrendResponse> {
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getMockTrendsData(city, horizonDays)), 250);
    });
  }

  const response = await apiClient.get<TrendResponse>(ENDPOINTS.TRENDS, {
    params: { city, horizon_days: horizonDays }
  });
  return response.data;
}

export async function forecastTrend(request: TrendForecastRequest): Promise<TrendResponse> {
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getMockTrendsData(request.city, request.horizonDays || 7)), 250);
    });
  }

  const response = await apiClient.post<TrendResponse>(ENDPOINTS.TRENDS_FORECAST, request);
  return response.data;
}
