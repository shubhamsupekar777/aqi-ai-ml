import React from 'react';
import { Link } from 'react-router-dom';
import { Wind, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 mb-4 shadow-xs">
        <Wind className="w-8 h-8" />
      </div>
      <span className="text-xs font-mono font-bold tracking-widest text-teal-700 uppercase bg-teal-50 px-3 py-1 rounded-full border border-teal-200 mb-2">
        404 — Not Found
      </span>
      <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
        Atmospheric Telemetry Page Missing
      </h1>
      <p className="text-xs text-slate-500 max-w-md mt-2 mb-6">
        The route you requested does not correspond to an active environmental intelligence or model forecasting module.
      </p>

      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors shadow-xs"
      >
        <Home className="w-4 h-4" />
        <span>Return to Overview Dashboard</span>
      </Link>
    </div>
  );
};
