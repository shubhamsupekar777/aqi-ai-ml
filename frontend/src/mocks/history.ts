import { HistoricalDataResponse, HistoricalFilterParams, HistoricalRecord } from '../types/history';
import { getCategoryDefinition } from '../lib/aqi';

const SAMPLE_RECORDS: HistoricalRecord[] = [
  { id: 'h-1', city: 'Delhi', date: '2026-10-12', aqi: 185, category: 'Unhealthy', originalCategory: 'Poor', pm25: 114.5, pm10: 212.8, no2: 44.5, so2: 18.2, co: 1.4, o3: 42.0, temperature: 27.5, humidity: 55, windSpeed: 7.2, dataSource: 'CPCB Daily Station Net' },
  { id: 'h-2', city: 'Delhi', date: '2026-10-11', aqi: 172, category: 'Unhealthy', originalCategory: 'Poor', pm25: 106.2, pm10: 198.4, no2: 42.1, so2: 16.8, co: 1.3, o3: 40.5, temperature: 28.1, humidity: 53, windSpeed: 8.5, dataSource: 'CPCB Daily Station Net' },
  { id: 'h-3', city: 'Delhi', date: '2026-10-10', aqi: 164, category: 'Unhealthy', originalCategory: 'Moderate', pm25: 98.4, pm10: 184.2, no2: 39.8, so2: 15.4, co: 1.2, o3: 38.0, temperature: 29.0, humidity: 50, windSpeed: 9.1, dataSource: 'CPCB Daily Station Net' },
  { id: 'h-4', city: 'Delhi', date: '2026-10-09', aqi: 195, category: 'Unhealthy', originalCategory: 'Poor', pm25: 122.0, pm10: 226.5, no2: 48.2, so2: 19.5, co: 1.5, o3: 45.2, temperature: 26.8, humidity: 58, windSpeed: 6.2, dataSource: 'CPCB Daily Station Net' },
  { id: 'h-5', city: 'Delhi', date: '2026-10-08', aqi: 215, category: 'Very Unhealthy', originalCategory: 'Poor', pm25: 138.2, pm10: 248.0, no2: 52.4, so2: 21.0, co: 1.7, o3: 48.0, temperature: 25.9, humidity: 62, windSpeed: 5.5, dataSource: 'CPCB Daily Station Net' },
  { id: 'h-6', city: 'Mumbai', date: '2026-10-12', aqi: 92, category: 'Moderate', originalCategory: 'Satisfactory', pm25: 38.5, pm10: 95.2, no2: 28.4, so2: 11.2, co: 0.8, o3: 32.5, temperature: 31.2, humidity: 76, windSpeed: 14.8, dataSource: 'MPCB Air Monitoring Net' },
  { id: 'h-7', city: 'Mumbai', date: '2026-10-11', aqi: 88, category: 'Moderate', originalCategory: 'Satisfactory', pm25: 35.8, pm10: 89.4, no2: 26.8, so2: 10.5, co: 0.8, o3: 30.1, temperature: 31.5, humidity: 78, windSpeed: 15.2, dataSource: 'MPCB Air Monitoring Net' },
  { id: 'h-8', city: 'Mumbai', date: '2026-10-10', aqi: 95, category: 'Moderate', originalCategory: 'Satisfactory', pm25: 41.2, pm10: 98.7, no2: 29.5, so2: 11.8, co: 0.9, o3: 34.0, temperature: 30.8, humidity: 74, windSpeed: 13.9, dataSource: 'MPCB Air Monitoring Net' },
  { id: 'h-9', city: 'Pune', date: '2026-10-12', aqi: 78, category: 'Moderate', originalCategory: 'Satisfactory', pm25: 29.5, pm10: 74.2, no2: 22.1, so2: 9.4, co: 0.7, o3: 36.2, temperature: 28.6, humidity: 64, windSpeed: 11.2, dataSource: 'MPCB Air Monitoring Net' },
  { id: 'h-10', city: 'Pune', date: '2026-10-11', aqi: 82, category: 'Moderate', originalCategory: 'Satisfactory', pm25: 31.8, pm10: 79.5, no2: 23.5, so2: 9.8, co: 0.7, o3: 38.0, temperature: 28.2, humidity: 66, windSpeed: 10.5, dataSource: 'MPCB Air Monitoring Net' },
  { id: 'h-11', city: 'Bengaluru', date: '2026-10-12', aqi: 48, category: 'Good', originalCategory: 'Good', pm25: 16.2, pm10: 44.5, no2: 18.4, so2: 6.8, co: 0.5, o3: 24.5, temperature: 26.4, humidity: 62, windSpeed: 12.8, dataSource: 'KSPCB Continuous Ambient' },
  { id: 'h-12', city: 'Bengaluru', date: '2026-10-11', aqi: 45, category: 'Good', originalCategory: 'Good', pm25: 15.0, pm10: 41.8, no2: 17.6, so2: 6.2, co: 0.5, o3: 23.1, temperature: 26.8, humidity: 60, windSpeed: 13.5, dataSource: 'KSPCB Continuous Ambient' },
  { id: 'h-13', city: 'Chennai', date: '2026-10-12', aqi: 65, category: 'Moderate', originalCategory: 'Satisfactory', pm25: 24.2, pm10: 62.4, no2: 21.0, so2: 14.5, co: 0.6, o3: 28.0, temperature: 32.1, humidity: 82, windSpeed: 16.4, dataSource: 'TNPCB Online Telemetry' },
  { id: 'h-14', city: 'Chennai', date: '2026-10-11', aqi: 62, category: 'Moderate', originalCategory: 'Satisfactory', pm25: 22.8, pm10: 59.8, no2: 19.8, so2: 13.8, co: 0.6, o3: 27.2, temperature: 32.4, humidity: 80, windSpeed: 17.1, dataSource: 'TNPCB Online Telemetry' },
  { id: 'h-15', city: 'Hyderabad', date: '2026-10-12', aqi: 115, category: 'Unhealthy for Sensitive Groups', originalCategory: 'Moderate', pm25: 58.4, pm10: 118.2, no2: 32.5, so2: 12.4, co: 1.0, o3: 39.5, temperature: 29.8, humidity: 59, windSpeed: 9.8, dataSource: 'TSPCB Realtime Air Lab' },
  { id: 'h-16', city: 'Hyderabad', date: '2026-10-11', aqi: 122, category: 'Unhealthy for Sensitive Groups', originalCategory: 'Moderate', pm25: 62.0, pm10: 126.4, no2: 34.8, so2: 13.1, co: 1.1, o3: 41.0, temperature: 29.5, humidity: 61, windSpeed: 9.2, dataSource: 'TSPCB Realtime Air Lab' }
];

export function getMockHistoricalData(params: HistoricalFilterParams = {}): HistoricalDataResponse {
  let filtered = [...SAMPLE_RECORDS];

  if (params.city && params.city !== 'All Cities') {
    filtered = filtered.filter(r => r.city.toLowerCase() === params.city?.toLowerCase());
  }

  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(r => 
      r.city.toLowerCase().includes(s) || 
      r.date.includes(s) || 
      r.category.toLowerCase().includes(s)
    );
  }

  if (params.minAqi !== undefined) {
    filtered = filtered.filter(r => r.aqi >= params.minAqi!);
  }

  if (params.maxAqi !== undefined) {
    filtered = filtered.filter(r => r.aqi <= params.maxAqi!);
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const items = filtered.slice(startIndex, startIndex + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    metadata: {
      data_source: 'demo',
      model_status: 'not_trained',
      model_name: null,
      is_demo: true,
      timestamp: new Date().toISOString()
    }
  };
}
