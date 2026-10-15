import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import { useModelPerformance } from '../hooks/useModels';
import { ModelComparisonTable } from '../components/charts/ModelComparisonTable';
import { LoadingState } from '../components/common/LoadingState';
import type { ModelMetricItem, ModelRegistryItem } from '../types/model';

const MODEL_NAMES = {
  regression: 'RandomForestRegressor_AQI_NextDay',
  classification: 'RandomForestClassifier_AQI_Bucket',
  trend: 'RandomForestClassifier_AQI_Trend_3Day',
  risk: 'CPCB_AQI_Exposure_Rule_V1',
} as const;

const displayMetric = (value: number | undefined, digits = 3) =>
  value === undefined || value === null || !Number.isFinite(value) ? 'Not available' : value.toFixed(digits);

const displayPercent = (value: number | undefined) =>
  value === undefined || value === null || !Number.isFinite(value) ? 'Not available' : `${(value * 100).toFixed(1)}%`;

function ArtifactStatus({ model, metric }: { model?: ModelRegistryItem; metric?: ModelMetricItem }) {
  if (!model) return <span className="text-xs text-slate-500">Not returned by API</span>;
  if (model.algorithm === 'Rule Engine') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700"><ShieldCheck className="h-3.5 w-3.5" />Rule-based · active</span>;
  }
  if (!model.isTrained) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Clock className="h-3.5 w-3.5" />Artifact not found</span>;
  }
  if (metric?.f1 !== undefined && metric.f1 < 0.6) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><FlaskConical className="h-3.5 w-3.5" />Loaded · experimental</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Trained artifact detected</span>;
}

function ModelCard({
  title,
  subtitle,
  model,
  metric,
  details,
  icon,
  footer,
}: {
  title: string;
  subtitle: string;
  model?: ModelRegistryItem;
  metric?: ModelMetricItem;
  details: Array<[string, string]>;
  icon: React.ReactNode;
  footer: string;
}) {
  return (
    <article className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div>
        <div className="mb-2 flex items-start gap-2 text-sm font-bold text-slate-900">
          <span className="mt-0.5 text-teal-700">{icon}</span>
          <span>{title}</span>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">{subtitle}</p>
        <div className="space-y-2 text-xs text-slate-700">
          {details.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <span className="text-slate-500">{label}</span>
              <span className="text-right font-mono font-medium">{value}</span>
            </div>
          ))}
        </div>
        {model?.description && (
          <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">{model.description}</p>
        )}
      </div>
      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="mb-1 text-[11px] text-slate-500">{footer}</div>
        <ArtifactStatus model={model} metric={metric} />
      </div>
    </article>
  );
}

export const ModelPerformancePage: React.FC = () => {
  const { data, isLoading, error } = useModelPerformance();

  if (isLoading) {
    return <LoadingState message="Loading the trained model registry and evaluation reports..." />;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        <div className="mb-2 flex items-center gap-2 font-bold"><AlertTriangle className="h-5 w-5" />Could not load model registry</div>
        <p>{error instanceof Error ? error.message : 'The API did not return model registry data.'}</p>
        <p className="mt-2 text-xs">Check that FastAPI is running and GET /api/v1/models returns a complete response.</p>
      </div>
    );
  }

  const { models, metrics, evaluationRecordsAvailable } = data;
  const modelByName = (name: string) => models.find((model) => model.name === name);
  const metricByName = (name: string) => metrics.find((metric) => metric.modelName === name);

  const regressionModel = modelByName(MODEL_NAMES.regression);
  const regressionMetric = metricByName(MODEL_NAMES.regression);
  const classificationModel = modelByName(MODEL_NAMES.classification);
  const classificationMetric = metricByName(MODEL_NAMES.classification);
  const trendModel = modelByName(MODEL_NAMES.trend);
  const trendMetric = metricByName(MODEL_NAMES.trend);
  const riskModel = modelByName(MODEL_NAMES.risk);

  const trainedCount = models.filter((model) => model.isTrained).length;
  const ruleEngineCount = models.filter((model) => model.algorithm === 'Rule Engine').length;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">AQI AI Model Registry & Evaluation</h1>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
            Trained models + rule engine
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Actual saved artifacts and chronological holdout metrics for the project's implemented AQI models.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-900">
        <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
        <div>
          <strong>Registry status:</strong> {trainedCount} trained ML artifact(s) detected and {ruleEngineCount} rule engine(s) registered. Metrics are shown only for evaluated models; no placeholder predictions or synthetic comparison curve is generated.
          {` Registry response timestamp: ${new Date(data.metadata.timestamp).toLocaleString()}.`}
        </div>
      </div>

      <ModelComparisonTable
        models={models}
        metrics={metrics}
        evaluationRecordsAvailable={evaluationRecordsAvailable}
      />

      <section>
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900">Implemented model details</h2>
          <p className="mt-1 text-xs text-slate-500">Status and metrics below come from the registry response, not fixed demo benchmark estimates.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ModelCard
            title="Model 1 · Next-Day AQI Regression"
            subtitle="Predicts a numerical next-day AQI value using pollutant, weather, calendar, city and lag features."
            model={regressionModel}
            metric={regressionMetric}
            icon={<Cpu className="h-4 w-4" />}
            details={[
              ['Algorithm', 'Random Forest Regressor'],
              ['MAE', displayMetric(regressionMetric?.mae, 2)],
              ['RMSE', displayMetric(regressionMetric?.rmse, 2)],
              ['R²', displayMetric(regressionMetric?.r2, 3)],
            ]}
            footer="Chronological holdout evaluation"
          />
          <ModelCard
            title="Model 2 · CPCB AQI Classification"
            subtitle="Predicts one of six Indian CPCB AQI categories; numerical AQI is excluded as an input to avoid target leakage."
            model={classificationModel}
            metric={classificationMetric}
            icon={<CheckCircle2 className="h-4 w-4" />}
            details={[
              ['Algorithm', 'Random Forest Classifier'],
              ['Accuracy', displayPercent(classificationMetric?.accuracy)],
              ['Macro precision', displayPercent(classificationMetric?.precision)],
              ['Macro recall', displayPercent(classificationMetric?.recall)],
              ['Macro F1', displayPercent(classificationMetric?.f1)],
            ]}
            footer="Six CPCB AQI categories"
          />
          <ModelCard
            title="Model 3 · 3-Day Trend Classification"
            subtitle="Predicts Increasing, Stable or Decreasing over a smoothed three-day window; it does not predict exact daily AQI values."
            model={trendModel}
            metric={trendMetric}
            icon={<FlaskConical className="h-4 w-4" />}
            details={[
              ['Algorithm', 'Random Forest Classifier'],
              ['Accuracy', displayPercent(trendMetric?.accuracy)],
              ['Balanced accuracy', displayPercent(trendMetric?.balancedAccuracy)],
              ['Macro F1', displayPercent(trendMetric?.f1)],
              ['Stable recall', displayPercent(trendMetric?.stableRecall)],
            ]}
            footer="Experimental: performance is modest"
          />
          <ModelCard
            title="Model 4 · Pollution & Health Risk"
            subtitle="Maps an AQI observation to general exposure guidance using transparent rules. This is not a trained ML model or a personal medical assessment."
            model={riskModel}
            icon={<ShieldCheck className="h-4 w-4" />}
            details={[
              ['Method', 'CPCB AQI rule engine'],
              ['Output', 'Low · Moderate · High · Severe'],
              ['Trained weights', 'Not applicable'],
              ['ML metrics', 'Not applicable'],
            ]}
            footer="Deterministic rule engine · v1"
          />
        </div>
      </section>

      <p className="text-[11px] leading-relaxed text-slate-500">
        Evaluation scores describe held-out historical data and do not guarantee performance on newer live observations. The trend classifier should be considered experimental, and the exposure rule engine provides general guidance rather than medical advice.
      </p>
    </div>
  );
};


// import React from 'react';
// import {
//   Cpu,
//   Sparkles,
//   GitCompare,
//   Clock,
//   Layers,
//   ArrowRight,
//   Info,
//   CheckCircle,
//   AlertCircle,
// } from 'lucide-react';
// import { useModelPerformance } from '../hooks/useModels';
// import { ModelComparisonTable } from '../components/charts/ModelComparisonTable';
// import { DemoBadge } from '../components/common/DemoBadge';
// import { LoadingState } from '../components/common/LoadingState';

// export const ModelPerformancePage: React.FC = () => {
//   const { data, isLoading } = useModelPerformance();

//   if (isLoading || !data) {
//     return <LoadingState message="Inspecting ML model registry artifacts and benchmarks..." />;
//   }

//   const { models, metrics, comparisonPoints, evaluationRecordsAvailable } = data;

//   return (
//     <div className="space-y-6">
//       {/* Page Title */}
//       <div>
//         <div className="flex items-center gap-2">
//           <h1 className="text-2xl font-black text-slate-900 tracking-tight">
//             Machine Learning Registry & Benchmark Suite
//           </h1>
//           <DemoBadge variant="subtle" />
//         </div>
//         <p className="text-xs text-slate-500 mt-1">
//           Comparative evaluation of regression baselines, gradient boosting models, and deep learning recurrent forecasters
//         </p>
//       </div>

//       {/* Model Training Notice Banner */}
//       <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl flex items-start gap-3 text-xs text-slate-700">
//         <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
//         <div>
//           <span className="font-bold text-slate-900">Phase 1 Pre-Training Architectural Contract:</span> No trained model artifacts have been committed to disk yet.
//           The benchmark metrics displayed below reflect preliminary target criteria and simulated cross-validation baselines.
//           Actual serialized weights (`.joblib`, `.xgb`, `.pt`) can be loaded into `backend/app/ml/models/` during Phase 2.
//         </div>
//       </div>

//       {/* Core Comparison Table */}
//       <ModelComparisonTable
//         models={models}
//         metrics={metrics}
//         evaluationRecordsAvailable={evaluationRecordsAvailable}
//       />

//       {/* Algorithm Architecture Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
//           <div>
//             <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
//               <span className="w-2 h-2 rounded-full bg-teal-600" />
//               <span>Random Forest Regressor</span>
//             </div>
//             <p className="text-xs text-slate-500 mb-3">Bagging decision trees ensemble for non-linear atmospheric baseline</p>
//             <div className="space-y-1.5 text-xs text-slate-600 font-mono">
//               <div>Framework: scikit-learn</div>
//               <div>Estimators: 150 Trees</div>
//               <div>Max Depth: 16</div>
//             </div>
//           </div>
//           <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
//             <span>Status: In Development</span>
//             <span className="text-amber-700 font-semibold font-mono">Demo Mode</span>
//           </div>
//         </div>

//         <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
//           <div>
//             <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
//               <span className="w-2 h-2 rounded-full bg-blue-600" />
//               <span>XGBoost & LightGBM Regressors</span>
//             </div>
//             <p className="text-xs text-slate-500 mb-3">Gradient boosting with L1/L2 regularization on meteorological interactions</p>
//             <div className="space-y-1.5 text-xs text-slate-600 font-mono">
//               <div>Framework: XGBoost / LightGBM</div>
//               <div>Learning Rate: 0.05</div>
//               <div>Subsample: 0.85</div>
//             </div>
//           </div>
//           <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
//             <span>Status: In Development</span>
//             <span className="text-amber-700 font-semibold font-mono">Demo Mode</span>
//           </div>
//         </div>

//         <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
//           <div>
//             <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
//               <span className="w-2 h-2 rounded-full bg-purple-600" />
//               <span>Deep LSTM Sequence Forecaster</span>
//             </div>
//             <p className="text-xs text-slate-500 mb-3">Recurrent neural network with temporal sequence memory for multi-step horizons</p>
//             <div className="space-y-1.5 text-xs text-slate-600 font-mono">
//               <div>Framework: PyTorch / Keras</div>
//               <div>Hidden Units: 64 x 2 layers</div>
//               <div>Sequence Length: 24 steps</div>
//             </div>
//           </div>
//           <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
//             <span>Status: Phase 2 Integration</span>
//             <span className="text-slate-500 font-semibold font-mono">Pending</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
