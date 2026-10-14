import React from 'react';
import { CorrelationCell } from '../../types/analytics';
import { DemoBadge } from '../common/DemoBadge';

interface CorrelationHeatmapProps {
  data: CorrelationCell[];
  title?: string;
  className?: string;
}

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  data,
  title = 'Multi-Tracer & Meteorological Correlation Matrix',
  className = '',
}) => {
  const variables = Array.from(new Set(data.map(d => d.x)));

  function getColor(val: number): string {
    if (val === 1) return 'bg-teal-700 text-white';
    if (val > 0.6) return 'bg-teal-500 text-white';
    if (val > 0.3) return 'bg-teal-200 text-teal-900';
    if (val > 0) return 'bg-teal-50 text-teal-800';
    if (val > -0.3) return 'bg-amber-50 text-amber-800';
    if (val > -0.6) return 'bg-rose-200 text-rose-900';
    return 'bg-rose-600 text-white';
  }

  return (
    <div className={`p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-sm md:text-base font-bold text-slate-900">{title}</h3>
        <DemoBadge variant="subtle" />
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Pearson correlation coefficients showing pollutant dispersion and atmospheric drivers
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-xs font-semibold text-slate-400"></th>
              {variables.map(v => (
                <th key={v} className="p-2 text-xs font-bold text-slate-700 font-mono">
                  {v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variables.map(yVar => (
              <tr key={yVar}>
                <td className="p-2 text-xs font-bold text-slate-700 font-mono text-left">
                  {yVar}
                </td>
                {variables.map(xVar => {
                  const cell = data.find(d => d.x === xVar && d.y === yVar);
                  const val = cell ? cell.value : 0;
                  return (
                    <td key={xVar} className="p-1">
                      <div
                        className={`py-2 px-1 text-xs font-mono font-semibold rounded-md ${getColor(val)} transition-all hover:scale-105 cursor-default`}
                        title={`${xVar} vs ${yVar}: ${val.toFixed(2)}`}
                      >
                        {val.toFixed(2)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-rose-600 rounded-xs" />
          <span>Strong Negative (-1.0)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-slate-100 rounded-xs border border-slate-200" />
          <span>Neutral (0.0)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-teal-700 rounded-xs" />
          <span>Strong Positive (+1.0)</span>
        </div>
      </div>
    </div>
  );
};
