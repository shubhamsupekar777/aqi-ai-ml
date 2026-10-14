export const ENDPOINTS = {
  HEALTH: '/health',
  HEALTH_DB: '/health/database',
  
  OVERVIEW: '/overview',
  CITIES: '/cities',
  CITY_BY_ID: (id: string) => `/cities/${id}`,
  
  AQI_LATEST: '/aqi/latest',
  AQI_HISTORY: '/aqi/history',
  POLLUTANTS_HISTORY: '/pollutants/history',
  
  PREDICT: '/aqi/predict',
  CLASSIFY: '/aqi/classify',
  TRENDS: '/aqi/trends',
  TRENDS_FORECAST: '/aqi/trends/forecast',
  RISK_ASSESSMENT: '/aqi/risk-assessment',
  
  ANALYTICS_SUMMARY: '/analytics/summary',
  ANALYTICS_CATEGORIES: '/analytics/category-distribution',
  ANALYTICS_CORRELATIONS: '/analytics/pollutant-correlations',
  ANALYTICS_SEASONAL: '/analytics/seasonal-patterns',
  
  MODELS: '/models',
  MODELS_STATUS: '/models/status',
  MODELS_METRICS: '/models/metrics'
} as const;
