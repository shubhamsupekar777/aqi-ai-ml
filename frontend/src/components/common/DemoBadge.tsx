import React from 'react';
import { Sparkles, Info } from 'lucide-react';

interface DemoBadgeProps {
  className?: string;
  variant?: 'banner' | 'pill' | 'subtle';
  text?: string;
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({
  className = '',
  variant = 'pill',
  text = 'DEMO DATA — Not live measurements or trained-model predictions'
}) => {
  if (variant === 'banner') {
    return (
      <div className={`w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-amber-900 text-xs font-medium flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{text}</span>
          <span className="hidden md:inline text-[11px] text-amber-700/80 font-normal">
            | Synthetic atmospheric simulation engine & deterministic test rules active
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'subtle') {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono ${className}`}>
        <Info className="w-3.5 h-3.5 text-slate-400" />
        <span>Demonstration Values</span>
      </span>
    );
  }

  return (
    <span
      title="All metrics, forecasts, and classifications displayed are synthetic demo data. Live sensors and trained ML models can be connected via Phase 2 interfaces."
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-amber-50 border border-amber-200 text-amber-800 shadow-xs cursor-help ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <span>DEMO DATA</span>
    </span>
  );
};
