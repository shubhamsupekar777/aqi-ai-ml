import { useMutation } from '@tanstack/react-query';
import { assessRisk } from '../services/riskService';
import { RiskAssessmentRequest, RiskAssessmentResponse } from '../types/risk';

export function useRiskAssessment() {
  return useMutation<RiskAssessmentResponse, Error, RiskAssessmentRequest>({
    mutationFn: (request: RiskAssessmentRequest) => assessRisk(request)
  });
}
