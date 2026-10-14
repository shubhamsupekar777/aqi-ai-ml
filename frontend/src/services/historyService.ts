import { apiClient, isMockMode } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { HistoricalDataResponse, HistoricalFilterParams } from '../types/history';
import { getMockHistoricalData } from '../mocks/history';

export async function fetchHistoricalData(params: HistoricalFilterParams = {}): Promise<HistoricalDataResponse> {
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getMockHistoricalData(params)), 200);
    });
  }

  const response = await apiClient.get<HistoricalDataResponse>(ENDPOINTS.AQI_HISTORY, {
    params: {
      city: params.city !== 'All Cities' ? params.city : undefined,
      start_date: params.startDate,
      end_date: params.endDate,
      min_aqi: params.minAqi,
      max_aqi: params.maxAqi,
      search: params.search,
      page: params.page,
      page_size: params.pageSize
    }
  });
  return response.data;
}
