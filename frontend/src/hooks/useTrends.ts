import { useQuery } from '@tanstack/react-query';
import { fetchTrends } from '../services/trendService';

export function useTrends(city: string, horizonDays: number = 7) {
  return useQuery({
    queryKey: ['trends', city, horizonDays],
    queryFn: () => fetchTrends(city, horizonDays),
    enabled: !!city
  });
}
