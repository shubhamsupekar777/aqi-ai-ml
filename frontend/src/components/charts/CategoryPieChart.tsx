import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { AQICategory } from '../../types/aqi';
import { DemoBadge } from '../common/DemoBadge';

interface CategoryPieChartProps {
  data: Array<{
    category: AQICategory;
    count: number;
    percentage: number;
    color: string;
  }>;
  title?: string;
  className?: string;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  data,
  title = 'Pollution Category Distribution',
  className = '',
}) => {
  return (
    <div className={`p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-sm md:text-base font-bold text-slate-900">{title}</h3>
        <DemoBadge variant="subtle" />
      </div>
      <p className="text-xs text-slate-500 mb-4">Proportional breakdown of days across regulatory health tiers</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg border border-slate-700">
                      <p className="font-semibold" style={{ color: d.color }}>{d.category}</p>
                      <p className="font-mono text-slate-300 mt-1">{d.count} days ({d.percentage}%)</p>
                    </div>
                  );
                }}
              />
              <Pie
                data={data}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2 text-xs">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-700 font-medium truncate max-w-[140px]">{item.category}</span>
              </div>
              <span className="font-mono text-slate-500">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
