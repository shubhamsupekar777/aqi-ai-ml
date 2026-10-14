import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { DiurnalHourPoint } from '../../types/analytics';
import { DemoBadge } from '../common/DemoBadge';

interface DiurnalPatternChartProps {
  data: DiurnalHourPoint[];
  title?: string;
  className?: string;
}

export const DiurnalPatternChart: React.FC<DiurnalPatternChartProps> = ({
  data,
  title = '24-Hour Diurnal Pollution Profiles by Metro Area',
  className = '',
}) => {
  return (
    <div className={`p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-sm md:text-base font-bold text-slate-900">{title}</h3>
        <DemoBadge variant="subtle" />
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Diurnal particulate variations driven by morning inversion and evening traffic peaks
      </p>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload as DiurnalHourPoint;
                return (
                  <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg border border-slate-700 text-xs font-sans">
                    <p className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1">Hour: {d.hour}</p>
                    <div className="space-y-1">
                      <p className="text-red-400">Delhi: <span className="font-mono">{d.delhi} AQI</span></p>
                      <p className="text-amber-400">Mumbai: <span className="font-mono">{d.mumbai} AQI</span></p>
                      <p className="text-teal-400">Bengaluru: <span className="font-mono">{d.bengaluru} AQI</span></p>
                      <p className="text-blue-400">Pune: <span className="font-mono">{d.pune} AQI</span></p>
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Line type="monotone" dataKey="delhi" name="Delhi" stroke="#ef4444" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="mumbai" name="Mumbai" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="bengaluru" name="Bengaluru" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="pune" name="Pune" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
