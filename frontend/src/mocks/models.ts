import { ModelPerformanceResponse, ModelRegistryItem, ModelMetricItem } from '../types/model';

export const MOCK_MODEL_REGISTRY: ModelRegistryItem[] = [
  {
    id: 'rf-reg-v1',
    name: 'RandomForestRegressor_AQI',
    version: '1.0.0-draft',
    taskType: 'regression',
    algorithm: 'Random Forest',
    framework: 'scikit-learn 1.4+',
    status: 'in_development',
    isTrained: false,
    description: 'Ensemble of 150 decision trees trained on multi-station particulate and weather features.',
    lastTrained: undefined
  },
  {
    id: 'xgb-reg-v1',
    name: 'XGBoostRegressor_AQI',
    version: '1.0.0-draft',
    taskType: 'regression',
    algorithm: 'XGBoost',
    framework: 'xgboost 2.0+',
    status: 'in_development',
    isTrained: false,
    description: 'Gradient boosted trees with regularization for non-linear meteorological interactions.',
    lastTrained: undefined
  },
  {
    id: 'lgb-reg-v1',
    name: 'LightGBMRegressor_AQI',
    version: '1.0.0-draft',
    taskType: 'regression',
    algorithm: 'LightGBM',
    framework: 'lightgbm 4.3+',
    status: 'in_development',
    isTrained: false,
    description: 'Histogram-based fast gradient boosting with leaf-wise expansion.',
    lastTrained: undefined
  },
  {
    id: 'ens-stack-v1',
    name: 'StackingEnsemble_AQI',
    version: '1.0.0-draft',
    taskType: 'regression',
    algorithm: 'Stacking Ensemble',
    framework: 'scikit-learn 1.4+',
    status: 'not_trained',
    isTrained: false,
    description: 'Ridge Meta-Learner combining Random Forest, XGBoost, and LightGBM base estimators.',
    lastTrained: undefined
  },
  {
    id: 'lstm-seq-v1',
    name: 'DeepLSTM_Seq2Seq_AQI',
    version: '0.1.0-planned',
    taskType: 'forecasting',
    algorithm: 'LSTM Deep Learning',
    framework: 'PyTorch / TensorFlow',
    status: 'not_trained',
    isTrained: false,
    description: 'Multi-layer recurrent LSTM cell architecture for multi-step temporal sequence forecasting.',
    lastTrained: undefined
  }
];

export const DEMO_PREVIEW_METRICS: ModelMetricItem[] = [
  {
    modelName: 'RandomForestRegressor_AQI',
    algorithm: 'Random Forest',
    taskType: 'regression',
    mae: 14.8,
    rmse: 21.2,
    r2: 0.84,
    evaluationRecordsAvailable: false,
    isDemoEstimate: true
  },
  {
    modelName: 'XGBoostRegressor_AQI',
    algorithm: 'XGBoost',
    taskType: 'regression',
    mae: 12.1,
    rmse: 18.5,
    r2: 0.88,
    evaluationRecordsAvailable: false,
    isDemoEstimate: true
  },
  {
    modelName: 'LightGBMRegressor_AQI',
    algorithm: 'LightGBM',
    taskType: 'regression',
    mae: 12.6,
    rmse: 18.9,
    r2: 0.87,
    evaluationRecordsAvailable: false,
    isDemoEstimate: true
  },
  {
    modelName: 'StackingEnsemble_AQI',
    algorithm: 'Stacking Ensemble',
    taskType: 'regression',
    mae: 10.9,
    rmse: 16.7,
    r2: 0.91,
    evaluationRecordsAvailable: false,
    isDemoEstimate: true
  }
];

export function getMockModelPerformanceData(): ModelPerformanceResponse {
  const today = new Date();
  const comparisonPoints = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (7 - i));
    const base = 150 + Math.sin(i) * 30;
    return {
      date: d.toISOString().split('T')[0],
      actual: Math.round(base),
      rfPred: Math.round(base + (i % 2 === 0 ? 5 : -7)),
      xgbPred: Math.round(base + (i % 2 === 0 ? 3 : -4)),
      lgbmPred: Math.round(base + (i % 2 === 0 ? 4 : -5)),
      ensemblePred: Math.round(base + (i % 2 === 0 ? 2 : -2))
    };
  });

  return {
    models: MOCK_MODEL_REGISTRY,
    metrics: DEMO_PREVIEW_METRICS,
    comparisonPoints,
    evaluationRecordsAvailable: false,
    metadata: {
      data_source: 'demo',
      model_status: 'not_trained',
      model_name: null,
      is_demo: true,
      timestamp: new Date().toISOString()
    }
  };
}
