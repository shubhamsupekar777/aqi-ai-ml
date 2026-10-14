import { apiClient, isMockMode } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { PredictionRequest, PredictionResponse } from '../types/prediction';
import { generateMockPrediction } from '../mocks/predictions';

export async function predictAqi(request: PredictionRequest): Promise<PredictionResponse> {
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(generateMockPrediction(request)), 300);
    });
  }

  const response = await apiClient.post<PredictionResponse>(ENDPOINTS.PREDICT, request);
  return response.data;
}
