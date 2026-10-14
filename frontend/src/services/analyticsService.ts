import { apiClient, isMockMode } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { AnalyticsResponse } from '../types/analytics';
import { getMockAnalyticsData } from '../mocks/analytics';

export async function fetchAnalytics(city: string = 'All Cities'): Promise<AnalyticsResponse> {
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getMockAnalyticsData(city)), 250);
    });
  }

  const response = await apiClient.get<AnalyticsResponse>(ENDPOINTS.ANALYTICS_SUMMARY, {
    params: { city: city !== 'All Cities' ? city : undefined }
  });
  return response.data;
}
