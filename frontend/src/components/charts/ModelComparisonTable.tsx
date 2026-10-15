import React from 'react';
import { AlertCircle, CheckCircle2, Clock, FlaskConical } from 'lucide-react';
import type { ModelRegistryItem, ModelMetricItem } from '../../types/model';

interface ModelComparisonTableProps {
  models: ModelRegistryItem[];
  metrics: ModelMetricItem[];
  evaluationRecordsAvailable: boolean;
  className?: string;
}

const numberOrDash = (value: number | undefined, digits = 1) =>
  value === undefined || value === null || !Number.isFinite(value)
    ? '—'
    : value.toFixed(digits);

const percentOrDash = (value: number | undefined) =>
  value === undefined || value === null || !Number.isFinite(value)
    ? '—'
    : `${(value * 100).toFixed(1)}%`;

function statusFor(model: ModelRegistryItem, metric?: ModelMetricItem) {
  if (model.algorithm === 'Rule Engine') {
    return { label: 'Rule-based', classes: 'bg-sky-50 text-sky-700 border-sky-200', icon: CheckCircle2 };
  }
  if (!model.isTrained || model.status !== 'ready') {
    return { label: 'Artifact not found', classes: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock };
  }
  if (metric?.f1 !== undefined && metric.f1 < 0.6) {
    return { label: 'Experimental', classes: 'bg-amber-50 text-amber-800 border-amber-200', icon: FlaskConical };
  }
  return { label: 'Trained · evaluated', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
}

export const ModelComparisonTable: React.FC<ModelComparisonTableProps> = ({
  models,
  metrics,
  evaluationRecordsAvailable,
  className = '',
}) => {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-xs ${className}`}>
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 md:text-base">Trained Model Registry & Evaluation</h2>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${evaluationRecordsAvailable ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              {evaluationRecordsAvailable ? 'Holdout metrics available' : 'No evaluation metrics found'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Saved artifacts are detected from <code>backend/app/ml/models/</code>. Metrics are shown only for evaluated models.
          </p>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <span>Trend classifier is experimental; a loaded artifact does not guarantee reliable predictions.</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-3 pr-4 font-semibold">Model</th>
              <th className="pb-3 pr-4 font-semibold">Algorithm / Task</th>
              <th className="pb-3 pr-4 font-semibold">Status</th>
              <th className="pb-3 pr-3 text-right font-semibold">MAE</th>
              <th className="pb-3 pr-3 text-right font-semibold">RMSE</th>
              <th className="pb-3 pr-3 text-right font-semibold">R²</th>
              <th className="pb-3 pr-3 text-right font-semibold">Accuracy</th>
              <th className="pb-3 pr-3 text-right font-semibold">Macro F1</th>
              <th className="pb-3 pr-3 text-right font-semibold">Balanced Acc.</th>
              <th className="pb-3 text-right font-semibold">Stable Recall</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {models.map((model) => {
              const metric = metrics.find((item) => item.modelName === model.name);
              const status = statusFor(model, metric);
              const StatusIcon = status.icon;
              return (
                <tr key={model.id} className="align-top transition-colors hover:bg-slate-50/70">
                  <td className="py-4 pr-4">
                    <div className="font-mono font-medium text-slate-800">{model.name}</div>
                    <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-slate-500">{model.description}</p>
                    {model.artifactPath && (
                      <p className="mt-1 break-all font-mono text-[10px] text-slate-400">{model.artifactPath}</p>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="font-medium text-slate-700">{model.algorithm}</div>
                    <div className="mt-1 capitalize text-slate-500">{model.taskType}</div>
                    <div className="mt-1 text-[10px] text-slate-400">{model.framework} · v{model.version}</div>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${status.classes}`}>
                      <StatusIcon className="h-3 w-3" />{status.label}
                    </span>
                    {metric?.evaluationRecordsAvailable && (
                      <p className="mt-1 text-[10px] text-slate-400">Chronological holdout</p>
                    )}
                  </td>
                  <td className="py-4 pr-3 text-right font-mono text-slate-700">{numberOrDash(metric?.mae, 2)}</td>
                  <td className="py-4 pr-3 text-right font-mono text-slate-700">{numberOrDash(metric?.rmse, 2)}</td>
                  <td className="py-4 pr-3 text-right font-mono font-semibold text-teal-700">{numberOrDash(metric?.r2, 3)}</td>
                  <td className="py-4 pr-3 text-right font-mono text-slate-700">{percentOrDash(metric?.accuracy)}</td>
                  <td className="py-4 pr-3 text-right font-mono text-slate-700">{percentOrDash(metric?.f1)}</td>
                  <td className="py-4 pr-3 text-right font-mono text-slate-700">{percentOrDash(metric?.balancedAccuracy)}</td>
                  <td className="py-4 text-right font-mono text-slate-700">{percentOrDash(metric?.stableRecall)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>— means no applicable metric or no evaluation report is available.</span>
        <span>Model 4 is a deterministic rule engine, not a trained ML model.</span>
      </div>
    </section>
  );
};
