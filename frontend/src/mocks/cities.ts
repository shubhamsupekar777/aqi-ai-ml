import { City } from '../types/aqi';

export const MOCK_CITIES: City[] = [
  {
    id: 'delhi',
    name: 'Delhi',
    state: 'Delhi (NCT)',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.2090
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    latitude: 19.0760,
    longitude: 72.8777
  },
  {
    id: 'pune',
    name: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    latitude: 18.5204,
    longitude: 73.8567
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    latitude: 12.9716,
    longitude: 77.5946
  },
  {
    id: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    latitude: 13.0827,
    longitude: 80.2707
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    latitude: 17.3850,
    longitude: 78.4867
  }
];

export const CITY_BASE_AQI: Record<string, { current: number; predNextDay: number; dominant: string }> = {
  Delhi: { current: 185, predNextDay: 205, dominant: 'PM2.5' },
  Mumbai: { current: 92, predNextDay: 88, dominant: 'PM10' },
  Pune: { current: 78, predNextDay: 84, dominant: 'O3' },
  Bengaluru: { current: 48, predNextDay: 52, dominant: 'NO2' },
  Chennai: { current: 65, predNextDay: 62, dominant: 'SO2' },
  Hyderabad: { current: 115, predNextDay: 122, dominant: 'PM2.5' }
};
