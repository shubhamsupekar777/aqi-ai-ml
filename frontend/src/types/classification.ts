import { AQICategory } from './aqi';
import { ApiResponseMetadata } from './api';

export interface ClassificationRequest {
  aqi: number;
  city?: string;
  scheme?: 'US_EPA' | 'INDIA_CPCB';
}

export interface ClassificationCategoryProb {
  category: AQICategory;
  probability: number;
}

export interface ClassificationResponse {
  aqi: number;
  category: AQICategory;
  schemeIdentifier: string;
  explanation: string;
  healthStatement: string;
  cautionaryStatement: string;
  color: string;
  probabilities?: ClassificationCategoryProb[] | null;
  history?: Array<{
    id: string;
    timestamp: string;
    aqi: number;
    category: AQICategory;
    city: string;
  }>;
  categoryDistribution: Array<{
    category: AQICategory;
    count: number;
    percentage: number;
    color: string;
  }>;
  metadata: ApiResponseMetadata;
}
