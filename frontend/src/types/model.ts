import type { ApiResponseMetadata } from './api';

export type TaskType = 'regression' | 'classification' | 'forecasting';
export type AlgorithmType =
  | 'Random Forest'
  | 'XGBoost'
  | 'LightGBM'
  | 'Stacking Ensemble'
  | 'LSTM Deep Learning'
  | 'Rule Engine';

export interface ModelRegistryItem {
  id: string;
  name: string;
  version: string;
  taskType: TaskType;
  algorithm: AlgorithmType | string;
  framework: string;
  status: 'ready' | 'not_trained' | 'in_development';
  isTrained: boolean;
  artifactPath?: string;
  description: string;
  lastTrained?: string;
}

export interface ModelMetricItem {
  modelName: string;
  algorithm: AlgorithmType | string;
  taskType: TaskType;
  mae?: number;
  rmse?: number;
  r2?: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  /** Classifier metric, stored on a 0–1 scale. */
  balancedAccuracy?: number;
  /** Recall for the Stable class; stored on a 0–1 scale. */
  stableRecall?: number;
  evaluationRecordsAvailable: boolean;
  /** True only for a synthetic UI estimate. Real holdout scores are false. */
  isDemoEstimate: boolean;
}

export interface ModelComparisonPoint {
  date: string;
  actual: number;
  rfPred: number;
  xgbPred: number;
  lgbmPred: number;
  ensemblePred: number;
}

export interface ModelPerformanceResponse {
  models: ModelRegistryItem[];
  metrics: ModelMetricItem[];
  comparisonPoints: ModelComparisonPoint[];
  evaluationRecordsAvailable: boolean;
  metadata: ApiResponseMetadata;
}


// import { ApiResponseMetadata } from './api';

// export type TaskType = 'regression' | 'classification' | 'forecasting';
// export type AlgorithmType = 'Random Forest' | 'XGBoost' | 'LightGBM' | 'Stacking Ensemble' | 'LSTM Deep Learning';

// export interface ModelRegistryItem {
//   id: string;
//   name: string;
//   version: string;
//   taskType: TaskType;
//   algorithm: AlgorithmType;
//   framework: string;
//   status: 'ready' | 'not_trained' | 'in_development';
//   isTrained: boolean;
//   artifactPath?: string;
//   description: string;
//   lastTrained?: string;
// }

// export interface ModelMetricItem {
//   modelName: string;
//   algorithm: AlgorithmType;
//   taskType: TaskType;
//   mae?: number;
//   rmse?: number;
//   r2?: number;
//   accuracy?: number;
//   precision?: number;
//   recall?: number;
//   f1?: number;
//   evaluationRecordsAvailable: boolean;
//   isDemoEstimate: boolean;
// }

// export interface ModelComparisonPoint {
//   date: string;
//   actual: number;
//   rfPred: number;
//   xgbPred: number;
//   lgbmPred: number;
//   ensemblePred: number;
// }

// export interface ModelPerformanceResponse {
//   models: ModelRegistryItem[];
//   metrics: ModelMetricItem[];
//   comparisonPoints: ModelComparisonPoint[];
//   evaluationRecordsAvailable: boolean;
//   metadata: ApiResponseMetadata;
// }
