
/**
 * Shared metadata returned by the FastAPI backend.
 * Strings are allowed so new data sources and model types
 * can be integrated without repeatedly changing these types.
 */
export type DataSource = string;
export type ModelStatus = string;
export type PredictionType = string;

export interface ApiResponseMetadata {
  data_source: DataSource;
  model_status: ModelStatus;
  model_name: string | null;
  prediction_type?: PredictionType;
  is_demo: boolean;
  timestamp: string;
}

export interface StandardApiResponse<T> {
  success: boolean;
  data: T;
  metadata: ApiResponseMetadata;
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}


// export type DataSource = 'demo' | 'database' | 'ml_model' | 'sensor_api';
// export type ModelStatus = 'not_trained' | 'training' | 'ready' | 'degraded' | 'error';
// export type PredictionType = 'demo' | 'regression_rf' | 'regression_xgb' | 'regression_lgb' | 'ensemble' | 'lstm_forecast';

// export interface ApiResponseMetadata {
//   data_source: DataSource;
//   model_status: ModelStatus;
//   model_name: string | null;
//   prediction_type?: PredictionType;
//   is_demo: boolean;
//   timestamp: string;
// }

// export interface StandardApiResponse<T> {
//   success: boolean;
//   data: T;
//   metadata: ApiResponseMetadata;
//   message?: string;
// }

// export interface PaginatedResult<T> {
//   items: T[];
//   total: number;
//   page: number;
//   page_size: number;
//   total_pages: number;
// }
