import { AnalyticsResponse } from '../types/analytics';

export function getMockAnalyticsData(cityName: string = 'All Cities'): AnalyticsResponse {
  return {
    summary: {
      meanAqi: 112.4,
      medianAqi: 96.0,
      minAqi: 24.0,
      maxAqi: 388.0,
      stdAqi: 54.8,
      totalRecords: 1420,
      cleanAirDays: 312,
      hazardDays: 28
    },
    seasonalPatterns: [
      { season: 'Winter (Nov - Feb)', averageAqi: 198.5, avgPm25: 122.4, avgTemp: 14.8, dominantPollutant: 'PM2.5' },
      { season: 'Pre-Monsoon (Mar - May)', averageAqi: 124.2, avgPm25: 78.1, avgTemp: 32.5, dominantPollutant: 'PM10' },
      { season: 'Monsoon (Jun - Sep)', averageAqi: 52.8, avgPm25: 28.6, avgTemp: 28.2, dominantPollutant: 'NO2' },
      { season: 'Post-Monsoon (Oct)', averageAqi: 164.7, avgPm25: 104.3, avgTemp: 24.1, dominantPollutant: 'PM2.5' }
    ],
    diurnalProfile: [
      { hour: '00:00', delhi: 195, mumbai: 96, bengaluru: 45, pune: 82 },
      { hour: '03:00', delhi: 215, mumbai: 102, bengaluru: 42, pune: 88 },
      { hour: '06:00', delhi: 240, mumbai: 118, bengaluru: 58, pune: 98 },
      { hour: '09:00', delhi: 210, mumbai: 105, bengaluru: 62, pune: 90 },
      { hour: '12:00', delhi: 155, mumbai: 84, bengaluru: 46, pune: 68 },
      { hour: '15:00', delhi: 142, mumbai: 76, bengaluru: 40, pune: 62 },
      { hour: '18:00', delhi: 180, mumbai: 95, bengaluru: 54, pune: 80 },
      { hour: '21:00', delhi: 220, mumbai: 108, bengaluru: 50, pune: 92 }
    ],
    correlationMatrix: [
      { x: 'PM2.5', y: 'PM2.5', value: 1.0 },
      { x: 'PM2.5', y: 'PM10', value: 0.88 },
      { x: 'PM2.5', y: 'NO2', value: 0.65 },
      { x: 'PM2.5', y: 'SO2', value: 0.42 },
      { x: 'PM2.5', y: 'Temp', value: -0.58 },
      { x: 'PM2.5', y: 'Wind', value: -0.72 },

      { x: 'PM10', y: 'PM2.5', value: 0.88 },
      { x: 'PM10', y: 'PM10', value: 1.0 },
      { x: 'PM10', y: 'NO2', value: 0.62 },
      { x: 'PM10', y: 'SO2', value: 0.39 },
      { x: 'PM10', y: 'Temp', value: -0.45 },
      { x: 'PM10', y: 'Wind', value: -0.68 },

      { x: 'NO2', y: 'PM2.5', value: 0.65 },
      { x: 'NO2', y: 'PM10', value: 0.62 },
      { x: 'NO2', y: 'NO2', value: 1.0 },
      { x: 'NO2', y: 'SO2', value: 0.51 },
      { x: 'NO2', y: 'Temp', value: -0.32 },
      { x: 'NO2', y: 'Wind', value: -0.49 },

      { x: 'SO2', y: 'PM2.5', value: 0.42 },
      { x: 'SO2', y: 'PM10', value: 0.39 },
      { x: 'SO2', y: 'NO2', value: 0.51 },
      { x: 'SO2', y: 'SO2', value: 1.0 },
      { x: 'SO2', y: 'Temp', value: -0.18 },
      { x: 'SO2', y: 'Wind', value: -0.35 },

      { x: 'Temp', y: 'PM2.5', value: -0.58 },
      { x: 'Temp', y: 'PM10', value: -0.45 },
      { x: 'Temp', y: 'NO2', value: -0.32 },
      { x: 'Temp', y: 'SO2', value: -0.18 },
      { x: 'Temp', y: 'Temp', value: 1.0 },
      { x: 'Temp', y: 'Wind', value: 0.41 },

      { x: 'Wind', y: 'PM2.5', value: -0.72 },
      { x: 'Wind', y: 'PM10', value: -0.68 },
      { x: 'Wind', y: 'NO2', value: -0.49 },
      { x: 'Wind', y: 'SO2', value: -0.35 },
      { x: 'Wind', y: 'Temp', value: 0.41 },
      { x: 'Wind', y: 'Wind', value: 1.0 }
    ],
    citySummaries: [
      { city: 'Delhi', avgAqi: 218.4, maxAqi: 388, minAqi: 75, dominantPollutant: 'PM2.5', status: 'High Pollution Zone' },
      { city: 'Hyderabad', avgAqi: 118.2, maxAqi: 195, minAqi: 48, dominantPollutant: 'PM2.5', status: 'Moderate Exposure' },
      { city: 'Mumbai', avgAqi: 96.5, maxAqi: 172, minAqi: 38, dominantPollutant: 'PM10', status: 'Coastal Dispersion' },
      { city: 'Pune', avgAqi: 82.1, maxAqi: 145, minAqi: 32, dominantPollutant: 'O3', status: 'Moderate Stability' },
      { city: 'Chennai', avgAqi: 68.4, maxAqi: 122, minAqi: 28, dominantPollutant: 'SO2', status: 'Maritime Regulated' },
      { city: 'Bengaluru', avgAqi: 51.3, maxAqi: 94, minAqi: 24, dominantPollutant: 'NO2', status: 'Clean Ambient Air' }
    ],
    metadata: {
      data_source: 'demo',
      model_status: 'not_trained',
      model_name: null,
      prediction_type: 'demo',
      is_demo: true,
      timestamp: new Date().toISOString()
    }
  };
}
