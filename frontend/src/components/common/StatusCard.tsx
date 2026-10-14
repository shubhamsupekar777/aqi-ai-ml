import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  highlightColor?: string;
  className?: string;
  isDemo?: boolean;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
  className = '',
  isDemo = true,
}) => {
  return (
    <div
      className={`relative p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs card-shadow-hover overflow-hidden ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {title}
            </span>
            {isDemo && (
              <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded font-mono">
                demo
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-semibold ${
                  trend.direction === 'up'
                    ? 'text-red-600'
                    : trend.direction === 'down'
                    ? 'text-emerald-600'
                    : 'text-slate-500'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-1">{subtitle}</p>
          )}
          {badge && <div className="mt-2.5">{badge}</div>}
        </div>

        {Icon && (
          <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};
