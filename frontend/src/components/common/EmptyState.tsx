import React from 'react';
import { Database, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'Try adjusting your search filters, city selection, or date range parameters.',
  actionText,
  onAction,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-10 text-center bg-white rounded-xl border border-dashed border-slate-300 ${className}`}
    >
      <div className="p-3 bg-slate-50 text-slate-400 rounded-full mb-3">
        {icon || <Database className="w-8 h-8" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-3.5 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading environmental intelligence telemetry...',
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs font-medium text-slate-500">{message}</p>
    </div>
  );
};
