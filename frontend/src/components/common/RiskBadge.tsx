import React from 'react';
import { RiskLevel } from '../../types/aqi';
import { ShieldCheck, ShieldAlert, AlertTriangle, AlertOctagon } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const configs = {
    'Low Risk': {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      icon: ShieldCheck,
    },
    'Moderate Risk': {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: ShieldAlert,
    },
    'High Risk': {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: AlertTriangle,
    },
    'Severe Risk': {
      bg: 'bg-rose-100',
      border: 'border-rose-300',
      text: 'text-rose-950',
      icon: AlertOctagon,
    },
  };

  const config = configs[level] || configs['Moderate Risk'];
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
      {showIcon && <Icon className={`${iconSizes[size]} shrink-0`} />}
      <span>{level}</span>
    </span>
  );
};
