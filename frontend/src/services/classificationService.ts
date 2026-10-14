import { apiClient, isMockMode } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { ClassificationRequest, ClassificationResponse } from '../types/classification';
import { generateMockClassification } from '../mocks/classification';

export async function classifyAqi(request: ClassificationRequest): Promise<ClassificationResponse> {
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(generateMockClassification(request)), 200);
    });
  }

  const response = await apiClient.post<ClassificationResponse>(ENDPOINTS.CLASSIFY, request);
  return response.data;
}
