import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  Info,
  Layers,
  MapPin,
  Activity,
} from 'lucide-react';
import { useSelectedCity } from '../context/CityContext';
import { useCities } from '../hooks/useOverview';
import { useTrends } from '../hooks/useTrends';
import { TrendBadge } from '../components/common/TrendBadge';
import { CategoryBadge } from '../components/common/CategoryBadge';
import { ForecastChart } from '../components/charts/ForecastChart';
import { HistoricalAQIChart } from '../components/charts/HistoricalAQIChart';
import { DemoBadge } from '../components/common/DemoBadge';
import { LoadingState } from '../components/common/LoadingState';
import { formatPercent } from '../lib/formatters';

export const PollutionTrendsPage: React.FC = () => {
  const { selectedCity, setSelectedCity } = useSelectedCity();
  const { data: cities } = useCities();
  const [horizonDays, setHorizonDays] = useState<number>(7);
  const { data: trendData, isLoading, error } = useTrends(selectedCity, horizonDays);

  const cityList = cities || [
    { id: 'delhi', name: 'Delhi' },
    { id: 'mumbai', name: 'Mumbai' },
    { id: 'pune', name: 'Pune' },
    { id: 'bengaluru', name: 'Bengaluru' },
    { id: 'chennai', name: 'Chennai' },
    { id: 'hyderabad', name: 'Hyderabad' }
  ];

  if (isLoading) {
    return <LoadingState message={`Computing trend trajectories for ${selectedCity}...`} />;
  }

  if (error || !trendData) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center">
        <h3 className="text-sm font-bold text-red-800">Trend Analysis Error</h3>
        <p className="text-xs text-red-600 mt-1">{error?.message || 'Failed to retrieve trend forecast.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Pollution Trend & Trajectory Forecasting
            </h1>
            <DemoBadge variant="subtle" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Determine trajectory velocity (Increasing, Decreasing, or Stable) by correlating historical baseline with projected forecast endpoints
          </p>
        </div>

        {/* Horizon selector buttons */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 px-2 uppercase">Horizon:</span>
          {[3, 7, 14].map((d) => (
            <button
              key={d}
              onClick={() => setHorizonDays(d)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                horizonDays === d
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Main KPI Trend Summary Card */}
      <div className="p-6 bg-white rounded-xl border border-slate-200/90 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Station Baseline</span>
            <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">
              {trendData.referenceAqi}
            </div>
            <div className="mt-1">
              <CategoryBadge category={trendData.currentCategory} size="sm" />
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Classified Trajectory</span>
            <div className="mt-2">
              <TrendBadge trend={trendData.trendDirection} size="lg" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">±3 AQI margin tolerance</p>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Magnitude Delta</span>
            <div className={`text-3xl font-extrabold font-mono mt-1 ${
              trendData.delta > 0 ? 'text-red-600' : trendData.delta < 0 ? 'text-emerald-600' : 'text-slate-800'
            }`}>
              {trendData.delta > 0 ? `+${trendData.delta.toFixed(1)}` : trendData.delta.toFixed(1)}
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {formatPercent(trendData.percentageChange)} total shift
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Evaluation Method</span>
            <div className="text-sm font-bold text-slate-800 mt-1">
              Slope & Variance Filter
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {trendData.calculationMethod}
            </p>
          </div>
        </div>

        {/* Narrative Explanation Box */}
        <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
          <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 font-bold block mb-0.5">Atmospheric Trend Summary:</strong>
            {trendData.explanation}
          </div>
        </div>
      </div>

      {/* Trajectory Forecast Chart */}
      <ForecastChart
        data={trendData.combinedSeries}
        title={`${trendData.city} 14-Day Observed vs ${horizonDays}-Day Projected Trajectory`}
        subtitle="Solid line indicates recorded ground-level observations; dashed curve represents demo forecast sequence"
      />

      {/* Historical Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HistoricalAQIChart
          data={trendData.historicalSeries.map(p => ({
            date: p.date,
            aqi: p.aqi,
            category: p.category || 'Moderate',
            pm25: Math.round(p.aqi * 0.65),
            pm10: Math.round(p.aqi * 1.2),
            no2: 35,
            so2: 15,
            co: 1.0,
            o3: 40,
          }))}
          title={`${trendData.city} Historical Baseline Pre-Trajectory`}
        />

        {/* Future Integration Architecture Callout */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Phase 2 LSTM Deep Learning Forecasting Roadmap
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              This Phase 1 platform provides the exact input schemas, trajectory contracts, and chart layers for future recurrent sequence models.
              In Phase 2, this view will ingest:
            </p>

            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                <span><strong>Multi-layer LSTM / GRU Networks:</strong> Recurrent sequence-to-sequence cells handling lagged particulate time series.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                <span><strong>Exogenous Weather Integration:</strong> Boundary layer height, wind vector components, and relative humidity.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                <span><strong>Quantile Loss Confidence Envelopes:</strong> Scientifically calibrated 10th and 90th percentile bounds.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Model: PyTorch / TensorFlow LSTM Ready</span>
            <span className="text-teal-700 font-semibold">Service Contract: `/api/v1/aqi/trends`</span>
          </div>
        </div>
      </div>
    </div>
  );
};
