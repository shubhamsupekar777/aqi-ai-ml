import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { PollutantBreakdown } from '../../types/aqi';
import { DemoBadge } from '../common/DemoBadge';

interface PollutantBarChartProps {
  data: PollutantBreakdown;
  title?: string;
  className?: string;
}

export const PollutantBarChart: React.FC<PollutantBarChartProps> = ({
  data,
  title = 'Pollutant Concentrations Breakdown',
  className = '',
}) => {
  const chartItems = [
    { name: 'PM2.5', value: data.pm25, unit: 'µg/m³', limit: 60, color: '#ef4444' },
    { name: 'PM10', value: data.pm10, unit: 'µg/m³', limit: 100, color: '#f97316' },
    { name: 'NO2', value: data.no2, unit: 'µg/m³', limit: 80, color: '#f59e0b' },
    { name: 'SO2', value: data.so2, unit: 'µg/m³', limit: 80, color: '#0d9488' },
    { name: 'CO', value: data.co * 10, unit: 'mg/m³ (×10)', limit: 20, color: '#3b82f6' },
    { name: 'O3', value: data.o3, unit: 'µg/m³', limit: 100, color: '#8b5cf6' },
  ];

  return (
    <div className={`p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm md:text-base font-bold text-slate-900">{title}</h3>
            <DemoBadge variant="subtle" />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Atmospheric pollutant concentrations vs regulatory benchmarks</p>
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartItems} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                const actualVal = d.name === 'CO' ? (d.value / 10).toFixed(1) : d.value;
                return (
                  <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg border border-slate-700 text-xs font-sans min-w-[140px]">
                    <p className="font-bold text-teal-400">{d.name}</p>
                    <p className="text-sm font-extrabold text-white font-mono mt-1">
                      {actualVal} {d.name === 'CO' ? 'mg/m³' : 'µg/m³'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Safe Threshold: <span className="font-mono text-slate-200">{d.name === 'CO' ? '2.0 mg/m³' : `${d.limit} µg/m³`}</span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartItems.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
