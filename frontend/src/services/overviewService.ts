import { apiClient, isMockMode } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { OverviewResponse } from '../types/overview';
import { getMockOverviewData } from '../mocks/overview';
import { City } from '../types/aqi';
import { MOCK_CITIES } from '../mocks/cities';

export async function fetchOverview(city: string = 'Delhi'): Promise<OverviewResponse> {
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getMockOverviewData(city)), 200);
    });
  }

  const response = await apiClient.get<OverviewResponse>(ENDPOINTS.OVERVIEW, {
    params: { city }
  });
  return response.data;
}

export async function fetchCities(): Promise<City[]> {
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_CITIES), 100);
    });
  }

  const response = await apiClient.get<City[]>(ENDPOINTS.CITIES);
  return response.data;
}
