import React from 'react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
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
