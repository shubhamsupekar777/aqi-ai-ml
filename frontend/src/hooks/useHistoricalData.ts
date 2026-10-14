import { useQuery } from '@tanstack/react-query';
import { fetchHistoricalData } from '../services/historyService';
import { HistoricalFilterParams } from '../types/history';

export function useHistoricalData(params: HistoricalFilterParams) {
  return useQuery({
    queryKey: ['historical-data', params],
    queryFn: () => fetchHistoricalData(params)
  });
}
