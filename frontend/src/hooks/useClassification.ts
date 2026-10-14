import { useMutation } from '@tanstack/react-query';
import { classifyAqi } from '../services/classificationService';
import { ClassificationRequest, ClassificationResponse } from '../types/classification';

export function useClassification() {
  return useMutation<ClassificationResponse, Error, ClassificationRequest>({
    mutationFn: (request: ClassificationRequest) => classifyAqi(request)
  });
}
