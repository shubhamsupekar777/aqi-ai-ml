import { useQuery } from '@tanstack/react-query';
import { fetchAnalytics } from '../services/analyticsService';

export function useAnalytics(city: string = 'All Cities') {
  return useQuery({
    queryKey: ['analytics', city],
    queryFn: () => fetchAnalytics(city)
  });
}
