import { apiClient, isMockMode } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { RiskAssessmentRequest, RiskAssessmentResponse } from '../types/risk';
import { getMockRiskData } from '../mocks/risk';

export async function assessRisk(request: RiskAssessmentRequest): Promise<RiskAssessmentResponse> {
  if (isMockMode()) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getMockRiskData(request)), 200);
    });
  }

  const response = await apiClient.post<RiskAssessmentResponse>(ENDPOINTS.RISK_ASSESSMENT, request);
  return response.data;
}
