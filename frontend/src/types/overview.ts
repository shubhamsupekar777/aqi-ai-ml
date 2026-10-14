import { AQICategory, RiskLevel, TrendDirection, HistoricalAQIPoint, PollutantBreakdown } from './aqi';
import { ApiResponseMetadata } from './api';

export interface OverviewKpis {
  currentAqi: number;
  currentCategory: AQICategory;
  historicalAverageAqi: number;
  predictedNextDayAqi: number;
  trend: TrendDirection;
  trendDelta: number;
  highRiskLocationsCount: number;
}

export interface CityAqiComparisonItem {
  city: string;
  aqi: number;
  category: AQICategory;
  dominantPollutant: string;
  trend: TrendDirection;
}

export interface RecentPredictionItem {
  id: string;
  city: string;
  timestamp: string;
  referenceAqi: number;
  predictedAqi: number;
  horizon: string;
  category: AQICategory;
  trend: TrendDirection;
  risk: RiskLevel;
  isDemo: boolean;
}

export interface OverviewResponse {
  city: string;
  kpis: OverviewKpis;
  historicalSeries: HistoricalAQIPoint[];
  predictedComparisonSeries: Array<{
    date: string;
    actualAqi?: number;
    predictedAqi?: number;
    category?: AQICategory;
  }>;
  pollutantBreakdown: PollutantBreakdown;
  cityComparisons: CityAqiComparisonItem[];
  categoryDistribution: Array<{
    category: AQICategory;
    count: number;
    percentage: number;
    color: string;
  }>;
  recentPredictions: RecentPredictionItem[];
  warnings: Array<{
    id: string;
    severity: 'high' | 'moderate' | 'low';
    title: string;
    message: string;
    city: string;
    timestamp: string;
  }>;
  metadata: ApiResponseMetadata;
}
