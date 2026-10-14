import React from 'react';
import { ModelRegistryItem, ModelMetricItem } from '../../types/model';
import { Sparkles, AlertCircle, Clock } from 'lucide-react';

interface ModelComparisonTableProps {
  models: ModelRegistryItem[];
  metrics: ModelMetricItem[];
  evaluationRecordsAvailable: boolean;
  className?: string;
}

export const ModelComparisonTable: React.FC<ModelComparisonTableProps> = ({
  models,
  metrics,
  evaluationRecordsAvailable,
  className = '',
}) => {
  return (
    <div className={`p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm md:text-base font-bold text-slate-900">
              Model Registry & Benchmark Suite
            </h3>
            <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {evaluationRecordsAvailable ? 'Verified Metrics' : 'Demo Preview'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Architecture and evaluation metrics across regression algorithms and future LSTM deep learning
          </p>
        </div>

        {!evaluationRecordsAvailable && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Actual model weights pending Phase 2 training pipeline</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-medium">
              <th className="pb-3 font-semibold text-slate-600">Model Name</th>
              <th className="pb-3 font-semibold text-slate-600">Algorithm</th>
              <th className="pb-3 font-semibold text-slate-600">Task Type</th>
              <th className="pb-3 font-semibold text-slate-600">Status</th>
              <th className="pb-3 font-semibold text-slate-600 text-right">MAE</th>
              <th className="pb-3 font-semibold text-slate-600 text-right">RMSE</th>
              <th className="pb-3 font-semibold text-slate-600 text-right">R² Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {models.map(m => {
              const metric = metrics.find(met => met.modelName === m.name);
              return (
                <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 font-mono font-medium text-slate-800">
                    {m.name}
                    <div className="text-[11px] font-sans text-slate-400 font-normal">
                      {m.framework} • v{m.version}
                    </div>
                  </td>
                  <td className="py-3.5 text-slate-700 font-medium">{m.algorithm}</td>
                  <td className="py-3.5">
                    <span className="capitalize px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[11px]">
                      {m.taskType}
                    </span>
                  </td>
                  <td className="py-3.5">
                    {m.status === 'ready' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Ready
                      </span>
                    ) : m.status === 'in_development' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        In Dev (Demo)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Not Trained
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-right font-mono text-slate-700">
                    {metric?.mae !== undefined ? (
                      <span>{metric.mae.toFixed(1)} {metric.isDemoEstimate && <span className="text-[10px] text-amber-600">*</span>}</span>
                    ) : '—'}
                  </td>
                  <td className="py-3.5 text-right font-mono text-slate-700">
                    {metric?.rmse !== undefined ? (
                      <span>{metric.rmse.toFixed(1)} {metric.isDemoEstimate && <span className="text-[10px] text-amber-600">*</span>}</span>
                    ) : '—'}
                  </td>
                  <td className="py-3.5 text-right font-mono font-bold text-teal-700">
                    {metric?.r2 !== undefined ? (
                      <span>{metric.r2.toFixed(2)} {metric.isDemoEstimate && <span className="text-[10px] text-amber-600">*</span>}</span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>* Asterisk indicates simulated benchmark estimates for UI demonstration.</span>
        <span>Models loadable via Python ML inference engine (`backend/app/ml/`)</span>
      </div>
    </div>
  );
};
