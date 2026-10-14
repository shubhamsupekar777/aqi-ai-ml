import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { DemoBadge } from '../common/DemoBadge';
import { TrendDataPoint } from '../../types/trend';
import { formatDate } from '../../lib/formatters';

interface ForecastChartProps {
  data: TrendDataPoint[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  data,
  title = 'Historical vs Forecast Trajectory',
  subtitle = 'Continuous historical observations connected with projected demo forecast bounds',
  className = '',
}) => {
  // Format dates and separate historical vs forecast keys so Recharts draws two distinct lines
  const chartData = data.map(item => {
    return {
      date: item.date,
      formattedDate: formatDate(item.date),
      observedAqi: !item.isForecast ? item.aqi : null,
      forecastAqi: item.isForecast ? item.aqi : null,
      lowerBound: item.lowerBound ?? null,
      upperBound: item.upperBound ?? null,
      isForecast: item.isForecast,
      rawAqi: item.aqi,
      category: item.category,
    };
  });

  return (
    <div className={`p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm md:text-base font-bold text-slate-900">{title}</h3>
            <DemoBadge variant="subtle" />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-teal-600 rounded-full" />
            <span>Observed History</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-600" />
            <span>Demo Forecast</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-amber-500/20 border border-amber-500/30 rounded-xs" />
            <span>Confidence Interval</span>
          </div>
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="formattedDate"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg border border-slate-700 text-xs font-sans min-w-[150px]">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
                      <span className="font-semibold text-slate-300">{d.formattedDate}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        d.isForecast ? 'bg-amber-500/20 text-amber-400' : 'bg-teal-500/20 text-teal-300'
                      }`}>
                        {d.isForecast ? 'DEMO FORECAST' : 'OBSERVED'}
                      </span>
                    </div>
                    <p className={`font-mono font-bold text-sm ${d.isForecast ? 'text-amber-400' : 'text-teal-400'}`}>
                      AQI: {d.rawAqi}
                    </p>
                    {d.category && (
                      <p className="text-slate-400 mt-1">Tier: <span className="text-white font-medium">{d.category}</span></p>
                    )}
                    {d.isForecast && d.lowerBound && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Est. Range: <span className="font-mono text-amber-300">{d.lowerBound} – {d.upperBound}</span>
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="2 2" />
            <ReferenceLine y={200} stroke="#ef4444" strokeDasharray="2 2" />

            {/* Confidence Interval Area */}
            <Area
              dataKey="upperBound"
              stroke="none"
              fill="url(#confidenceGrad)"
              connectNulls
            />

            {/* Observed line */}
            <Line
              type="monotone"
              dataKey="observedAqi"
              stroke="#0d9488"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#0d9488' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />

            {/* Forecast line */}
            <Line
              type="monotone"
              dataKey="forecastAqi"
              stroke="#d97706"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={{ r: 4, fill: '#d97706', strokeWidth: 1.5, stroke: '#ffffff' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
