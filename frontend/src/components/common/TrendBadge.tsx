import React from 'react';
import { TrendDirection } from '../../types/aqi';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendBadgeProps {
  trend: TrendDirection;
  delta?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({
  trend,
  delta,
  size = 'md',
  className = '',
}) => {
  const configs = {
    Increasing: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: TrendingUp,
      label: 'Increasing',
    },
    Decreasing: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      icon: TrendingDown,
      label: 'Decreasing',
    },
    Stable: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: Minus,
      label: 'Stable',
    },
  };

  const config = configs[trend] || configs.Stable;
  const Icon = config.icon;

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 font-semibold gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${config.bg} ${config.border} ${config.text} ${sizeStyles[size]} ${className}`}
    >
      <Icon className={`${iconSizes[size]} shrink-0`} />
      <span>{config.label}</span>
      {delta !== undefined && (
        <span className="font-mono text-[10px] opacity-80">
          ({delta > 0 ? `+${delta.toFixed(0)}` : delta.toFixed(0)})
        </span>
      )}
    </span>
  );
};
