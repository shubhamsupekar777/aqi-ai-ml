import React from 'react';
import {
  Activity,
  AlertTriangle,
  Database,
  Info,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSelectedCity } from '../context/CityContext';
import { useTrends } from '../hooks/useTrends';
import { LoadingState } from '../components/common/LoadingState';
import { formatDate, formatTime } from '../lib/formatters';
import type { TrendDirection } from '../lib/aqi';

const TREND_STYLES: Record<TrendDirection, { color: string; label: string }> = {
  Increasing: { color: '#DC2626', label: 'Increasing' },
  Stable: { color: '#64748B', label: 'Stable' },
  Decreasing: { color: '#059669', label: 'Decreasing' },
};

const CPCB_COLORS: Record<string, string> = {
  Good: '#10B981',
  Satisfactory: '#84CC16',
  Moderate: '#F59E0B',
  Poor: '#F97316',
  'Very Poor': '#EF4444',
  Severe: '#881337',
};

type DailyChartPoint = {
  date: string;
  aqi: number | null;
  category: string | null;
  isMissing: boolean;
};

/**
 * Builds a calendar-day series from the actual stored observations.
 * Missing days receive a null AQI so the chart shows a gap rather than
 * drawing a line across dates for which no observation exists.
 */
const buildDailyChartHistory = <T extends { date: string; aqi: number; category?: string|null }>(
  observations: T[],
): DailyChartPoint[] => {
  if (observations.length === 0) return [];

  const byDate = new Map(observations.map((point) => [point.date, point] as const));
  const firstTime = Date.parse(`${observations[0].date}T00:00:00Z`);
  const lastTime = Date.parse(`${observations[observations.length - 1].date}T00:00:00Z`);

  if (!Number.isFinite(firstTime) || !Number.isFinite(lastTime) || firstTime > lastTime) {
    return observations.map((point) => ({
      date: point.date,
      aqi: point.aqi,
      category: point.category ?? null,
      isMissing: false,
    }));
  }

  const dailyPoints: DailyChartPoint[] = [];
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (let time = firstTime; time <= lastTime; time += oneDayMs) {
    const date = new Date(time).toISOString().slice(0, 10);
    const stored = byDate.get(date);

    dailyPoints.push({
      date,
      aqi: stored?.aqi ?? null,
      category: stored?.category ?? null,
      isMissing: !stored,
    });
  }

  return dailyPoints;
};

export const PollutionTrendsPage: React.FC = () => {
  const { selectedCity } = useSelectedCity();
  // The trained classifier predicts a 3-day smoothed trend direction only.
  const { data: trendData, isLoading, error } = useTrends(selectedCity, 3);

  if (isLoading) {
    return <LoadingState message={`Loading stored AQI history and classifying the trend for ${selectedCity}…`} />;
  }

  if (error || !trendData) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-red-600" />
        <h3 className="text-sm font-bold text-red-800">Trend classification failed</h3>
        <p className="mt-1 text-xs text-red-700">{error?.message || 'Unable to load trend classification.'}</p>
      </div>
    );
  }

  const trend = TREND_STYLES[trendData.trendDirection];
  const history = [...trendData.historicalSeries].sort((a, b) => a.date.localeCompare(b.date));
  const chartHistory = buildDailyChartHistory(history);
  const scores = [...(trendData.classScores ?? [])].sort((a, b) => b.score - a.score);
  const missingDayCount = chartHistory.filter((point) => point.isMissing).length;

  return (
    <div className="w-full min-w-0 space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Pollution Trend Classification</h1>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
            Random Forest · 3-day trend
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Classifies the direction of a smoothed AQI trend from stored pollutant, weather, location, calendar and lag features.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
        <p>
          This model predicts a trend category only. It does not estimate exact AQI values for each future day or provide a calibrated confidence interval. Data shown is historical and may not reflect current live conditions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Database className="h-4 w-4" /> Selected city</div>
          <div className="mt-2 text-xl font-black text-slate-900">{trendData.city}</div>
          <p className="mt-1 text-xs text-slate-500">Latest observation: {trendData.observationDate ? formatDate(trendData.observationDate) : 'Unavailable'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Activity className="h-4 w-4" /> Stored AQI · context</div>
          <div className="mt-2 font-mono text-3xl font-black text-slate-900">{Math.round(trendData.referenceAqi)}</div>
          <p className="mt-1 text-xs" style={{ color: CPCB_COLORS[trendData.currentCategory] ?? '#64748B' }}>{trendData.currentCategory}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {trendData.trendDirection === 'Increasing' ? <TrendingUp className="h-4 w-4" /> : trendData.trendDirection === 'Decreasing' ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            Predicted trend
          </div>
          <div className="mt-2 text-2xl font-black" style={{ color: trend.color }}>{trend.label}</div>
          <p className="mt-1 text-xs text-slate-500">Smoothed 3-day direction class</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Model status</div>
          <div className="mt-2 text-lg font-black text-slate-900">{trendData.metadata.model_status === 'ready' ? 'Model loaded' : trendData.metadata.model_status}</div>
          <p className="mt-1 break-words text-xs text-slate-500">{trendData.metadata.model_name ?? 'Model name unavailable'}</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">Historical AQI observations</h2>
        <p className="mb-4 mt-1 text-xs text-slate-500">
          Actual stored AQI readings for {trendData.city}; no synthetic future values are plotted. {missingDayCount > 0 ? 'Gaps indicate dates with no stored observation; missing values are not interpolated.' : 'No missing calendar dates were found in this displayed range.'}
        </p>
        {chartHistory.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartHistory} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => formatDate(value)}
                  tick={{ fontSize: 11 }}
                  minTickGap={24}
                  interval="preserveStartEnd"
                />
                <YAxis domain={[0, 'auto']} tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(label) => formatDate(String(label))}
                  formatter={(value) => [value == null ? 'No observation' : String(value), 'Stored AQI'] as [string, string]}
                />
                <Line
                  type="monotone"
                  dataKey="aqi"
                  stroke="#0D9488"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No historical records are available for this city.</p>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">Trend classifier class scores</h2>
          <p className="mb-4 mt-1 text-xs text-slate-500">Model vote scores are indicative and are not calibrated probabilities or health-risk estimates.</p>
          {scores.length > 0 ? (
            <div className="space-y-4">
              {scores.map((item) => {
                const style = TREND_STYLES[item.direction];
                return (
                  <div key={item.direction}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-700">{item.direction}</span>
                      <span className="font-mono text-slate-500">{(item.score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, item.score * 100))}%`, backgroundColor: style.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Class scores are not available from this model artifact.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">Prediction explanation</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">{trendData.explanation}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            <span>Source: {trendData.metadata.data_source}</span>
            <span>Demo: {trendData.metadata.is_demo ? 'Yes' : 'No'}</span>
            <span>Run at {formatTime(trendData.metadata.timestamp)}</span>
          </div>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Evaluation note: the current model's macro F1-score on the chronological holdout was 0.4861. Stable-trend recall was 0.23, so this result should be treated as experimental rather than a dependable forecast.
          </p>
        </section>
      </div>
    </div>
  );
};

// import React from 'react';
// import {
//   Activity,
//   AlertTriangle,
//   Database,
//   Info,
//   TrendingDown,
//   TrendingUp,
//   Minus,
// } from 'lucide-react';
// import {
//   CartesianGrid,
//   Line,
//   LineChart,
//   ResponsiveContainer,
//   Tooltip,
//   XAxis,
//   YAxis,
// } from 'recharts';
// import { useSelectedCity } from '../context/CityContext';
// import { useTrends } from '../hooks/useTrends';
// import { LoadingState } from '../components/common/LoadingState';
// import { formatDate, formatTime } from '../lib/formatters';
// import type { TrendDirection } from '../lib/aqi';

// const TREND_STYLES: Record<TrendDirection, { color: string; label: string }> = {
//   Increasing: { color: '#DC2626', label: 'Increasing' },
//   Stable: { color: '#64748B', label: 'Stable' },
//   Decreasing: { color: '#059669', label: 'Decreasing' },
// };

// const CPCB_COLORS: Record<string, string> = {
//   Good: '#10B981',
//   Satisfactory: '#84CC16',
//   Moderate: '#F59E0B',
//   Poor: '#F97316',
//   'Very Poor': '#EF4444',
//   Severe: '#881337',
// };

// export const PollutionTrendsPage: React.FC = () => {
//   const { selectedCity } = useSelectedCity();
//   // The trained classifier predicts a 3-day smoothed trend direction only.
//   const { data: trendData, isLoading, error } = useTrends(selectedCity, 3);

//   if (isLoading) {
//     return <LoadingState message={`Loading stored AQI history and classifying the trend for ${selectedCity}…`} />;
//   }

//   if (error || !trendData) {
//     return (
//       <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
//         <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-red-600" />
//         <h3 className="text-sm font-bold text-red-800">Trend classification failed</h3>
//         <p className="mt-1 text-xs text-red-700">{error?.message || 'Unable to load trend classification.'}</p>
//       </div>
//     );
//   }

//   const trend = TREND_STYLES[trendData.trendDirection];
//   const history = [...trendData.historicalSeries].sort((a, b) => a.date.localeCompare(b.date));
//   const scores = [...(trendData.classScores ?? [])].sort((a, b) => b.score - a.score);

//   return (
//     <div className="w-full min-w-0 space-y-6">
//       <header>
//         <div className="flex flex-wrap items-center gap-2">
//           <h1 className="text-2xl font-black tracking-tight text-slate-900">Pollution Trend Classification</h1>
//           <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
//             Random Forest · 3-day trend
//           </span>
//         </div>
//         <p className="mt-1 text-xs text-slate-500">
//           Classifies the direction of a smoothed AQI trend from stored pollutant, weather, location, calendar and lag features.
//         </p>
//       </header>

//       <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900">
//         <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
//         <p>
//           This model predicts a trend category only. It does not estimate exact AQI values for each future day or provide a calibrated confidence interval. Data shown is historical and may not reflect current live conditions.
//         </p>
//       </div>

//       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
//         <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//           <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Database className="h-4 w-4" /> Selected city</div>
//           <div className="mt-2 text-xl font-black text-slate-900">{trendData.city}</div>
//           <p className="mt-1 text-xs text-slate-500">Latest observation: {trendData.observationDate ? formatDate(trendData.observationDate) : 'Unavailable'}</p>
//         </div>
//         <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//           <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Activity className="h-4 w-4" /> Stored AQI · context</div>
//           <div className="mt-2 font-mono text-3xl font-black text-slate-900">{Math.round(trendData.referenceAqi)}</div>
//           <p className="mt-1 text-xs" style={{ color: CPCB_COLORS[trendData.currentCategory] ?? '#64748B' }}>{trendData.currentCategory}</p>
//         </div>
//         <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//           <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
//             {trendData.trendDirection === 'Increasing' ? <TrendingUp className="h-4 w-4" /> : trendData.trendDirection === 'Decreasing' ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
//             Predicted trend
//           </div>
//           <div className="mt-2 text-2xl font-black" style={{ color: trend.color }}>{trend.label}</div>
//           <p className="mt-1 text-xs text-slate-500">Smoothed 3-day direction class</p>
//         </div>
//         <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//           <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Model status</div>
//           <div className="mt-2 text-lg font-black text-slate-900">{trendData.metadata.model_status === 'ready' ? 'Model loaded' : trendData.metadata.model_status}</div>
//           <p className="mt-1 break-words text-xs text-slate-500">{trendData.metadata.model_name ?? 'Model name unavailable'}</p>
//         </div>
//       </div>

//       <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//         <h2 className="text-sm font-bold text-slate-900">Historical AQI observations</h2>
//         <p className="mb-4 mt-1 text-xs text-slate-500">Actual stored AQI readings for {trendData.city}; no synthetic future values are plotted.</p>
//         {history.length > 0 ? (
//           <div className="h-[300px] w-full">
//             <ResponsiveContainer width="100%" height="100%">
//               <LineChart data={history} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
//                 <XAxis dataKey="date" tickFormatter={(value: string) => formatDate(value)} tick={{ fontSize: 11 }} minTickGap={20} />
//                 <YAxis domain={[0, 'auto']} tick={{ fontSize: 11 }} />
//                 <Tooltip
//                   labelFormatter={(label) => formatDate(String(label))}
//                   // formatter={(value: number) => [value, 'Stored AQI']}
//                   formatter={(value) => [
//                     value == null ? 'N/A' : String(value),
//                     'Stored AQI',
//                   ] as [string, string]}
//                 />
//                 <Line type="monotone" dataKey="aqi" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
//               </LineChart>
//             </ResponsiveContainer>
//           </div>
//         ) : (
//           <p className="text-xs text-slate-500">No historical records are available for this city.</p>
//         )}
//       </section>

//       <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
//         <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//           <h2 className="text-sm font-bold text-slate-900">Trend classifier class scores</h2>
//           <p className="mb-4 mt-1 text-xs text-slate-500">Model vote scores are indicative and are not calibrated probabilities or health-risk estimates.</p>
//           {scores.length > 0 ? (
//             <div className="space-y-4">
//               {scores.map((item) => {
//                 const style = TREND_STYLES[item.direction];
//                 return (
//                   <div key={item.direction}>
//                     <div className="mb-1 flex items-center justify-between gap-2 text-xs">
//                       <span className="font-medium text-slate-700">{item.direction}</span>
//                       <span className="font-mono text-slate-500">{(item.score * 100).toFixed(1)}%</span>
//                     </div>
//                     <div className="h-2 overflow-hidden rounded-full bg-slate-100">
//                       <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, item.score * 100))}%`, backgroundColor: style.color }} />
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           ) : (
//             <p className="text-xs text-slate-500">Class scores are not available from this model artifact.</p>
//           )}
//         </section>

//         <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//           <h2 className="text-sm font-bold text-slate-900">Prediction explanation</h2>
//           <p className="mt-2 text-xs leading-relaxed text-slate-600">{trendData.explanation}</p>
//           <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
//             <span>Source: {trendData.metadata.data_source}</span>
//             <span>Demo: {trendData.metadata.is_demo ? 'Yes' : 'No'}</span>
//             <span>Run at {formatTime(trendData.metadata.timestamp)}</span>
//           </div>
//           <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
//             Evaluation note: the current model's macro F1-score on the chronological holdout was 0.4861. Stable-trend recall was 0.23, so this result should be treated as experimental rather than a dependable forecast.
//           </p>
//         </section>
//       </div>
//     </div>
//   );
// };



// import React, { useState } from 'react';
// import {
//   TrendingUp,
//   TrendingDown,
//   Minus,
//   Sparkles,
//   Calendar,
//   Clock,
//   ArrowRight,
//   Info,
//   Layers,
//   MapPin,
//   Activity,
// } from 'lucide-react';
// import { useSelectedCity } from '../context/CityContext';
// import { useCities } from '../hooks/useOverview';
// import { useTrends } from '../hooks/useTrends';
// import { TrendBadge } from '../components/common/TrendBadge';
// import { CategoryBadge } from '../components/common/CategoryBadge';
// import { ForecastChart } from '../components/charts/ForecastChart';
// import { HistoricalAQIChart } from '../components/charts/HistoricalAQIChart';
// import { DemoBadge } from '../components/common/DemoBadge';
// import { LoadingState } from '../components/common/LoadingState';
// import { formatPercent } from '../lib/formatters';

// export const PollutionTrendsPage: React.FC = () => {
//   const { selectedCity, setSelectedCity } = useSelectedCity();
//   const { data: cities } = useCities();
//   const [horizonDays, setHorizonDays] = useState<number>(7);
//   const { data: trendData, isLoading, error } = useTrends(selectedCity, horizonDays);

//   const cityList = cities || [
//     { id: 'delhi', name: 'Delhi' },
//     { id: 'mumbai', name: 'Mumbai' },
//     { id: 'pune', name: 'Pune' },
//     { id: 'bengaluru', name: 'Bengaluru' },
//     { id: 'chennai', name: 'Chennai' },
//     { id: 'hyderabad', name: 'Hyderabad' }
//   ];

//   if (isLoading) {
//     return <LoadingState message={`Computing trend trajectories for ${selectedCity}...`} />;
//   }

//   if (error || !trendData) {
//     return (
//       <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center">
//         <h3 className="text-sm font-bold text-red-800">Trend Analysis Error</h3>
//         <p className="text-xs text-red-600 mt-1">{error?.message || 'Failed to retrieve trend forecast.'}</p>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Title */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div>
//           <div className="flex items-center gap-2">
//             <h1 className="text-2xl font-black text-slate-900 tracking-tight">
//               Pollution Trend & Trajectory Forecasting
//             </h1>
//             <DemoBadge variant="subtle" />
//           </div>
//           <p className="text-xs text-slate-500 mt-1">
//             Determine trajectory velocity (Increasing, Decreasing, or Stable) by correlating historical baseline with projected forecast endpoints
//           </p>
//         </div>

//         {/* Horizon selector buttons */}
//         <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
//           <span className="text-[11px] font-bold text-slate-500 px-2 uppercase">Horizon:</span>
//           {[3, 7, 14].map((d) => (
//             <button
//               key={d}
//               onClick={() => setHorizonDays(d)}
//               className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
//                 horizonDays === d
//                   ? 'bg-teal-700 text-white shadow-xs'
//                   : 'text-slate-600 hover:bg-slate-100'
//               }`}
//             >
//               {d} Days
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Main KPI Trend Summary Card */}
//       <div className="p-6 bg-white rounded-xl border border-slate-200/90 shadow-xs">
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b border-slate-100">
//           <div>
//             <span className="text-xs font-semibold text-slate-400 uppercase">Station Baseline</span>
//             <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">
//               {trendData.referenceAqi}
//             </div>
//             <div className="mt-1">
//               <CategoryBadge category={trendData.currentCategory} size="sm" />
//             </div>
//           </div>

//           <div>
//             <span className="text-xs font-semibold text-slate-400 uppercase">Classified Trajectory</span>
//             <div className="mt-2">
//               <TrendBadge trend={trendData.trendDirection} size="lg" />
//             </div>
//             <p className="text-[11px] text-slate-500 mt-1">±3 AQI margin tolerance</p>
//           </div>

//           <div>
//             <span className="text-xs font-semibold text-slate-400 uppercase">Magnitude Delta</span>
//             <div className={`text-3xl font-extrabold font-mono mt-1 ${
//               trendData.delta > 0 ? 'text-red-600' : trendData.delta < 0 ? 'text-emerald-600' : 'text-slate-800'
//             }`}>
//               {trendData.delta > 0 ? `+${trendData.delta.toFixed(1)}` : trendData.delta.toFixed(1)}
//             </div>
//             <span className="text-[11px] font-mono text-slate-500">
//               {formatPercent(trendData.percentageChange)} total shift
//             </span>
//           </div>

//           <div>
//             <span className="text-xs font-semibold text-slate-400 uppercase">Evaluation Method</span>
//             <div className="text-sm font-bold text-slate-800 mt-1">
//               Slope & Variance Filter
//             </div>
//             <p className="text-[11px] text-slate-500 mt-1">
//               {trendData.calculationMethod}
//             </p>
//           </div>
//         </div>

//         {/* Narrative Explanation Box */}
//         <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
//           <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
//           <div>
//             <strong className="text-slate-900 font-bold block mb-0.5">Atmospheric Trend Summary:</strong>
//             {trendData.explanation}
//           </div>
//         </div>
//       </div>

//       {/* Trajectory Forecast Chart */}
//       <ForecastChart
//         data={trendData.combinedSeries}
//         title={`${trendData.city} 14-Day Observed vs ${horizonDays}-Day Projected Trajectory`}
//         subtitle="Solid line indicates recorded ground-level observations; dashed curve represents demo forecast sequence"
//       />

//       {/* Historical Breakdown */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         <HistoricalAQIChart
//           data={trendData.historicalSeries.map(p => ({
//             date: p.date,
//             aqi: p.aqi,
//             category: p.category || 'Moderate',
//             pm25: Math.round(p.aqi * 0.65),
//             pm10: Math.round(p.aqi * 1.2),
//             no2: 35,
//             so2: 15,
//             co: 1.0,
//             o3: 40,
//           }))}
//           title={`${trendData.city} Historical Baseline Pre-Trajectory`}
//         />

//         {/* Future Integration Architecture Callout */}
//         <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
//           <div>
//             <div className="flex items-center gap-2 mb-2">
//               <Sparkles className="w-4 h-4 text-teal-600" />
//               <h3 className="text-sm font-bold text-slate-900">
//                 Phase 2 LSTM Deep Learning Forecasting Roadmap
//               </h3>
//             </div>
//             <p className="text-xs text-slate-600 leading-relaxed mb-4">
//               This Phase 1 platform provides the exact input schemas, trajectory contracts, and chart layers for future recurrent sequence models.
//               In Phase 2, this view will ingest:
//             </p>

//             <ul className="space-y-2 text-xs text-slate-600">
//               <li className="flex items-start gap-2">
//                 <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
//                 <span><strong>Multi-layer LSTM / GRU Networks:</strong> Recurrent sequence-to-sequence cells handling lagged particulate time series.</span>
//               </li>
//               <li className="flex items-start gap-2">
//                 <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
//                 <span><strong>Exogenous Weather Integration:</strong> Boundary layer height, wind vector components, and relative humidity.</span>
//               </li>
//               <li className="flex items-start gap-2">
//                 <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
//                 <span><strong>Quantile Loss Confidence Envelopes:</strong> Scientifically calibrated 10th and 90th percentile bounds.</span>
//               </li>
//             </ul>
//           </div>

//           <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
//             <span>Model: PyTorch / TensorFlow LSTM Ready</span>
//             <span className="text-teal-700 font-semibold">Service Contract: `/api/v1/aqi/trends`</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
