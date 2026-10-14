import { useMutation } from '@tanstack/react-query';
import { predictAqi } from '../services/predictionService';
import { PredictionRequest, PredictionResponse } from '../types/prediction';

export function usePrediction() {
  return useMutation<PredictionResponse, Error, PredictionRequest>({
    mutationFn: (request: PredictionRequest) => predictAqi(request)
  });
}
