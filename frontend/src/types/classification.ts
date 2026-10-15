// import { AQICategory } from './aqi';
// import { ApiResponseMetadata } from './api';

// export interface ClassificationRequest {
//   aqi: number;
//   city?: string;
//   scheme?: 'US_EPA' | 'INDIA_CPCB';
// }

// export interface ClassificationCategoryProb {
//   category: AQICategory;
//   probability: number;
// }

// export interface ClassificationResponse {
//   aqi: number;
//   category: AQICategory;
//   schemeIdentifier: string;
//   explanation: string;
//   healthStatement: string;
//   cautionaryStatement: string;
//   color: string;
//   probabilities?: ClassificationCategoryProb[] | null;
//   history?: Array<{
//     id: string;
//     timestamp: string;
//     aqi: number;
//     category: AQICategory;
//     city: string;
//   }>;
//   categoryDistribution: Array<{
//     category: AQICategory;
//     count: number;
//     percentage: number;
//     color: string;
//   }>;
//   metadata: ApiResponseMetadata;
// }

import type { IndianCPCBCategory } from '../lib/aqi';
import type { ApiResponseMetadata } from './api';

export interface ClassificationRequest {
  /** City whose latest stored observation will be classified. */
  city: string;
}

export interface ClassificationCategoryProb {
  category: IndianCPCBCategory;
  /** Random Forest class vote score; not a calibrated probability of health risk. */
  probability: number;
}

export interface ClassificationResponse {
  /** Stored numerical AQI shown for context; it is not a model input. */
  aqi: number;
  city: string;
  observationDate: string;
  category: IndianCPCBCategory;
  schemeIdentifier: 'INDIA_CPCB';
  explanation: string;
  healthStatement: string;
  cautionaryStatement: string;
  color: string;
  probabilities?: ClassificationCategoryProb[] | null;
  history: Array<{
    id: string;
    timestamp: string;
    aqi: number;
    category: IndianCPCBCategory;
    city: string;
  }>;
  categoryDistribution: Array<{
    category: IndianCPCBCategory;
    count: number;
    percentage: number;
    color: string;
  }>;
  metadata: ApiResponseMetadata;
}
