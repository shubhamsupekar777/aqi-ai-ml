import { apiClient, isMockMode } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { ModelPerformanceResponse } from '../types/model';
import { getMockModelPerformanceData } from '../mocks/models';

export async function fetchModelPerformance(): Promise<ModelPerformanceResponse> {
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getMockModelPerformanceData()), 200);
    });
  }

  const response = await apiClient.get<ModelPerformanceResponse>(ENDPOINTS.MODELS_METRICS);
  return response.data;
}
