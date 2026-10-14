import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { DemoBadge } from '../common/DemoBadge';
import { HistoricalAQIPoint } from '../../types/aqi';
import { formatDate } from '../../lib/formatters';

interface HistoricalAQIChartProps {
  data: HistoricalAQIPoint[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export const HistoricalAQIChart: React.FC<HistoricalAQIChartProps> = ({
  data,
  title = 'Historical AQI Trend',
  subtitle = 'Continuous ambient air quality observations over the historical timeline',
  className = '',
}) => {
  const [metric, setMetric] = useState<'aqi' | 'pm25' | 'pm10'>('aqi');

  const formattedData = data.map(item => ({
    ...item,
    formattedDate: formatDate(item.date),
  }));

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

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setMetric('aqi')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              metric === 'aqi' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AQI
          </button>
          <button
            onClick={() => setMetric('pm25')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              metric === 'pm25' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PM2.5
          </button>
          <button
            onClick={() => setMetric('pm10')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              metric === 'pm10' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PM10
          </button>
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="aqiAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0d9488" stopOpacity={0.0} />
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
                const d = payload[0].payload as HistoricalAQIPoint & { formattedDate: string };
                return (
                  <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg border border-slate-700 text-xs font-sans min-w-[140px]">
                    <p className="font-semibold text-slate-300">{d.formattedDate}</p>
                    <div className="mt-1.5 space-y-1">
                      <p className="text-teal-400 font-bold font-mono text-sm">
                        AQI: {d.aqi}
                      </p>
                      <p className="text-slate-400">PM2.5: <span className="font-mono text-slate-200">{d.pm25} µg/m³</span></p>
                      <p className="text-slate-400">PM10: <span className="font-mono text-slate-200">{d.pm10} µg/m³</span></p>
                      <p className="text-slate-400">Category: <span className="font-medium text-amber-300">{d.category}</span></p>
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine y={50} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Good', fill: '#10b981', fontSize: 10, position: 'insideTopLeft' }} />
            <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Moderate', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }} />
            <ReferenceLine y={150} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Unhealthy', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }} />
            <Area
              type="monotone"
              dataKey={metric}
              stroke="#0d9488"
              strokeWidth={2.5}
              fill="url(#aqiAreaGrad)"
              activeDot={{ r: 6, fill: '#0d9488', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
