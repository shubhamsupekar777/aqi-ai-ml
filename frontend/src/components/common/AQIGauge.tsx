import React from 'react';
import { AQICategory } from '../../types/aqi';
import { getCategoryDefinition } from '../../lib/aqi';

interface AQIGaugeProps {
  aqi: number;
  category: AQICategory;
  standard?: string;
  subtitle?: string;
  className?: string;
}

export const AQIGauge: React.FC<AQIGaugeProps> = ({
  aqi,
  category,
  standard = 'US EPA Standard',
  subtitle,
  className = '',
}) => {
  const catDef = getCategoryDefinition(aqi);

  // Clamped 0..500
  const clampedAqi = Math.max(0, Math.min(500, aqi));
  const r = 95;
  const cx = 130;
  const cy = 130;
  const arcLength = Math.PI * r;
  const strokeDashoffset = arcLength * (1 - clampedAqi / 500);

  return (
    <div className={`relative flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs ${className}`}>
      {/* Standard indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
        <span>Standard:</span>
        <span className="font-semibold text-slate-700">{standard}</span>
      </div>

      <div className="w-full max-w-[280px] h-[160px] relative flex items-end justify-center overflow-hidden pt-2">
        <svg viewBox="0 0 260 145" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="25%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#F97316" />
              <stop offset="75%" stopColor="#EF4444" />
              <stop offset="90%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Active fill */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />

          {/* Ticks */}
          <circle cx={cx - r} cy={cy} r="3" fill="#94a3b8" />
          <circle cx={cx + r} cy={cy} r="3" fill="#94a3b8" />
        </svg>

        {/* Center reading */}
        <div className="absolute bottom-2 flex flex-col items-center">
          <span className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 font-mono">
            {Math.round(aqi)}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
            Air Quality Index
          </span>
        </div>
      </div>

      {/* Breakpoint indicator labels */}
      <div className="w-full max-w-[280px] flex justify-between px-2 text-[10px] text-slate-400 font-mono mt-1">
        <span>0</span>
        <span>50</span>
        <span>100</span>
        <span>150</span>
        <span>200</span>
        <span>300</span>
        <span>500</span>
      </div>

      {/* Category banner below */}
      <div className="mt-4 flex flex-col items-center text-center">
        <span
          className="px-3.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase border shadow-xs"
          style={{
            backgroundColor: catDef.bgColor.replace('bg-', ''),
            borderColor: catDef.color,
            color: catDef.color
          }}
        >
          {category || catDef.category}
        </span>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
