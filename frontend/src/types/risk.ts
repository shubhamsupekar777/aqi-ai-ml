
import type { RiskLevel, IndianCPCBCategory } from '../lib/aqi';
import type { ApiResponseMetadata } from './api';

export interface RiskAssessmentRequest {
  aqi?: number;
  city?: string;
  pm25?: number;
  pm10?: number;
  no2?: number;
  o3?: number;
}

export interface DemographicGuideline {
  group: string;
  exposureRisk: string;
  recommendation: string;
}

export interface RiskAssessmentResponse {
  city: string;
  observationDate?: string | null;
  observationSource?: string | null;
  referenceAqi: number;
  category: IndianCPCBCategory;
  riskClassification: RiskLevel;
  ruleIdentifier: string;
  warningTitle: string;
  summary: string;
  explanation: string;
  generalPrecautions: string[];
  demographicGuidelines: DemographicGuideline[];

  riskDistribution: Array<{
    level: RiskLevel;
    count: number;
    percentage: number;
    color: string;
  }>;

  cityRiskComparison: Array<{
    city: string;
    aqi: number;
    risk: RiskLevel;
    color: string;
  }>;

  metadata: ApiResponseMetadata;
}


// import { RiskLevel, AQICategory } from './aqi';
// import { ApiResponseMetadata } from './api';

// export interface RiskAssessmentRequest {
//   aqi?: number;
//   city?: string;
//   pm25?: number;
//   pm10?: number;
//   no2?: number;
//   o3?: number;
// }

// export interface DemographicGuideline {
//   group: string;
//   exposureRisk: string;
//   recommendation: string;
// }

// export interface RiskAssessmentResponse {
//   city: string;
//   referenceAqi: number;
//   category: AQICategory;
//   riskClassification: RiskLevel;
//   ruleIdentifier: string;
//   warningTitle: string;
//   summary: string;
//   explanation: string;
//   generalPrecautions: string[];
//   demographicGuidelines: DemographicGuideline[];
//   riskDistribution: Array<{
//     level: RiskLevel;
//     count: number;
//     percentage: number;
//     color: string;
//   }>;
//   cityRiskComparison: Array<{
//     city: string;
//     aqi: number;
//     risk: RiskLevel;
//     color: string;
//   }>;
//   metadata: ApiResponseMetadata;
// }
