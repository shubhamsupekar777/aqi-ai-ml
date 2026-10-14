import { useQuery } from '@tanstack/react-query';
import { fetchModelPerformance } from '../services/modelService';

export function useModelPerformance() {
  return useQuery({
    queryKey: ['model-performance'],
    queryFn: fetchModelPerformance
  });
}
