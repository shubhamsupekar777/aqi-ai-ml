import { useQuery } from '@tanstack/react-query';
import { fetchOverview, fetchCities } from '../services/overviewService';

export function useOverview(city: string) {
  return useQuery({
    queryKey: ['overview', city],
    queryFn: () => fetchOverview(city),
    enabled: !!city
  });
}

export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: fetchCities
  });
}
