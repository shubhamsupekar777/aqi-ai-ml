import { ClassificationRequest, ClassificationResponse } from '../types/classification';
import { getCategoryDefinition } from '../lib/aqi';

export function generateMockClassification(request: ClassificationRequest): ClassificationResponse {
  const aqiVal = Math.max(0, Math.round(request.aqi));
  const categoryDef = getCategoryDefinition(aqiVal);

  return {
    aqi: aqiVal,
    category: categoryDef.category,
    schemeIdentifier: request.scheme || 'US_EPA',
    explanation: `Numerical AQI of ${aqiVal} falls within threshold band [${categoryDef.min} - ${categoryDef.max}] according to the US EPA standard configuration.`,
    healthStatement: categoryDef.healthStatement,
    cautionaryStatement: categoryDef.cautionaryStatement,
    color: categoryDef.color,
    probabilities: null, // Note: Intentionally null per Phase 1 spec (no fabricated ML confidence scores)
    history: [
      {
        id: 'cls-1',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        aqi: aqiVal,
        category: categoryDef.category,
        city: request.city || 'Delhi'
      },
      {
        id: 'cls-2',
        timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        aqi: 142,
        category: 'Unhealthy for Sensitive Groups',
        city: 'Hyderabad'
      },
      {
        id: 'cls-3',
        timestamp: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
        aqi: 45,
        category: 'Good',
        city: 'Bengaluru'
      },
      {
        id: 'cls-4',
        timestamp: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
        aqi: 95,
        category: 'Moderate',
        city: 'Mumbai'
      }
    ],
    categoryDistribution: [
      { category: 'Good', count: 12, percentage: 16.7, color: '#10B981' },
      { category: 'Moderate', count: 28, percentage: 38.9, color: '#F59E0B' },
      { category: 'Unhealthy for Sensitive Groups', count: 18, percentage: 25.0, color: '#F97316' },
      { category: 'Unhealthy', count: 10, percentage: 13.9, color: '#EF4444' },
      { category: 'Very Unhealthy', count: 4, percentage: 5.5, color: '#8B5CF6' },
      { category: 'Hazardous', count: 0, percentage: 0.0, color: '#881337' }
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
