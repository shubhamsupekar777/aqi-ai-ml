// import { apiClient, isMockMode } from './apiClient';
// import { ENDPOINTS } from './endpoints';
// import { ModelPerformanceResponse } from '../types/model';
// import { getMockModelPerformanceData } from '../mocks/models';

// export async function fetchModelPerformance(): Promise<ModelPerformanceResponse> {
//   if (isMockMode()) {
//     return new Promise((resolve) => {
//       setTimeout(() => resolve(getMockModelPerformanceData()), 200);
//     });
//   }

//   const response = await apiClient.get<ModelPerformanceResponse>(ENDPOINTS.MODELS_METRICS);
//   return response.data;
// }


import { apiClient, isMockMode } from './apiClient';
import { ENDPOINTS } from './endpoints';
import type { ModelPerformanceResponse } from '../types/model';
import { getMockModelPerformanceData } from '../mocks/models';

/**
 * Fetch the complete model-performance payload.
 * GET /models returns models + metrics + comparisonPoints + metadata.
 * GET /models/metrics returns only a partial payload and therefore cannot
 * satisfy ModelPerformancePage / ModelComparisonTable.
 */
export async function fetchModelPerformance(): Promise<ModelPerformanceResponse> {
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getMockModelPerformanceData()), 200);
    });
  }

  const response = await apiClient.get<ModelPerformanceResponse>(ENDPOINTS.MODELS);
  const data = response.data;

  // Protect the UI from an unexpected/incomplete API response.
  if (!Array.isArray(data.models) || !Array.isArray(data.metrics)) {
    throw new Error(
      'The Model Performance API returned an incomplete response. Expected models and metrics arrays from GET /models.'
    );
  }

  return {
    ...data,
    models: data.models,
    metrics: data.metrics,
    comparisonPoints: Array.isArray(data.comparisonPoints) ? data.comparisonPoints : [],
  };
}
