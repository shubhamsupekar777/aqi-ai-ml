import React from 'react';
import {
  Cpu,
  Sparkles,
  GitCompare,
  Clock,
  Layers,
  ArrowRight,
  Info,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useModelPerformance } from '../hooks/useModels';
import { ModelComparisonTable } from '../components/charts/ModelComparisonTable';
import { DemoBadge } from '../components/common/DemoBadge';
import { LoadingState } from '../components/common/LoadingState';

export const ModelPerformancePage: React.FC = () => {
  const { data, isLoading } = useModelPerformance();

  if (isLoading || !data) {
    return <LoadingState message="Inspecting ML model registry artifacts and benchmarks..." />;
  }

  const { models, metrics, comparisonPoints, evaluationRecordsAvailable } = data;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Machine Learning Registry & Benchmark Suite
          </h1>
          <DemoBadge variant="subtle" />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Comparative evaluation of regression baselines, gradient boosting models, and deep learning recurrent forecasters
        </p>
      </div>

      {/* Model Training Notice Banner */}
      <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl flex items-start gap-3 text-xs text-slate-700">
        <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900">Phase 1 Pre-Training Architectural Contract:</span> No trained model artifacts have been committed to disk yet.
          The benchmark metrics displayed below reflect preliminary target criteria and simulated cross-validation baselines.
          Actual serialized weights (`.joblib`, `.xgb`, `.pt`) can be loaded into `backend/app/ml/models/` during Phase 2.
        </div>
      </div>

      {/* Core Comparison Table */}
      <ModelComparisonTable
        models={models}
        metrics={metrics}
        evaluationRecordsAvailable={evaluationRecordsAvailable}
      />

      {/* Algorithm Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
              <span className="w-2 h-2 rounded-full bg-teal-600" />
              <span>Random Forest Regressor</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">Bagging decision trees ensemble for non-linear atmospheric baseline</p>
            <div className="space-y-1.5 text-xs text-slate-600 font-mono">
              <div>Framework: scikit-learn</div>
              <div>Estimators: 150 Trees</div>
              <div>Max Depth: 16</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Status: In Development</span>
            <span className="text-amber-700 font-semibold font-mono">Demo Mode</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>XGBoost & LightGBM Regressors</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">Gradient boosting with L1/L2 regularization on meteorological interactions</p>
            <div className="space-y-1.5 text-xs text-slate-600 font-mono">
              <div>Framework: XGBoost / LightGBM</div>
              <div>Learning Rate: 0.05</div>
              <div>Subsample: 0.85</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Status: In Development</span>
            <span className="text-amber-700 font-semibold font-mono">Demo Mode</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <span>Deep LSTM Sequence Forecaster</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">Recurrent neural network with temporal sequence memory for multi-step horizons</p>
            <div className="space-y-1.5 text-xs text-slate-600 font-mono">
              <div>Framework: PyTorch / Keras</div>
              <div>Hidden Units: 64 x 2 layers</div>
              <div>Sequence Length: 24 steps</div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Status: Phase 2 Integration</span>
            <span className="text-slate-500 font-semibold font-mono">Pending</span>
          </div>
        </div>
      </div>
    </div>
  );
};
