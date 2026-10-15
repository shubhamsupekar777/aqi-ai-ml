import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  Brain,
  ShieldAlert,
  ArrowRight,
  Activity,
} from 'lucide-react';

import { useSelectedCity } from '../context/CityContext';
import { useOverview } from '../hooks/useOverview';
import { StatusCard } from '../components/common/StatusCard';
import { AQIGauge } from '../components/common/AQIGauge';
import { CategoryBadge } from '../components/common/CategoryBadge';
import { TrendBadge } from '../components/common/TrendBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { HistoricalAQIChart } from '../components/charts/HistoricalAQIChart';
import { PollutantBarChart } from '../components/charts/PollutantBarChart';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { LoadingState } from '../components/common/LoadingState';
import { formatAQI, formatDate, formatTime } from '../lib/formatters';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedCity } = useSelectedCity();
  const { data, isLoading, error } = useOverview(selectedCity);

  if (isLoading) {
    return <LoadingState message={`Loading historical AQI records for ${selectedCity}...`} />;
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center">
        <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-red-800">Unable to Load Overview</h3>
        <p className="text-xs text-red-600 mt-1">
          {error?.message || `No historical AQI data could be loaded for ${selectedCity}.`}
        </p>
      </div>
    );
  }

  const {
    kpis,
    historicalSeries,
    pollutantBreakdown,
    categoryDistribution,
    cityComparisons,
    recentPredictions,
    warnings,
  } = data;

  // The backend returns the most recent stored observation first after sorting
  // the series chronologically. It is not necessarily a reading from today.
  const latestObservationDate = historicalSeries.length
    ? historicalSeries[historicalSeries.length - 1].date
    : null;

  // There may be no saved prediction yet. Do not turn null into a fabricated value.
  const predictedAqi = Number.isFinite(kpis.predictedNextDayAqi)
    ? kpis.predictedNextDayAqi
    : null;

  const historicalDelta = typeof kpis.trendDelta === 'number' && Number.isFinite(kpis.trendDelta)
    ? kpis.trendDelta
    : null;

  const historicalTrend = kpis.trend;
  const trendDirection = historicalTrend === 'Increasing'
    ? 'up'
    : historicalTrend === 'Decreasing'
      ? 'down'
      : 'neutral';

  const historicalTrendValue = historicalDelta === null
    ? `${historicalTrend} (change unavailable)`
    : `${historicalTrend} ${historicalDelta > 0 ? '+' : ''}${historicalDelta} AQI vs previous record`;

  const observationDateLabel = latestObservationDate
    ? formatDate(latestObservationDate)
    : 'Date unavailable';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {selectedCity} Environmental Intelligence
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              Historical Data
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            PostgreSQL-backed historical observations, pollutant measurements, and saved model predictions.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Latest stored observation: <span className="font-semibold text-slate-700">{observationDateLabel}</span>
            {' · '}AQI categories use the Indian CPCB scale.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/prediction')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 shadow-xs"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Forecast AQI</span>
          </button>
          <button
            onClick={() => navigate('/classification')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Classify</span>
          </button>
          <button
            onClick={() => navigate('/trends')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Trends</span>
          </button>
          <button
            onClick={() => navigate('/risk')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Health Risk</span>
          </button>
        </div>
      </div>

      {warnings && warnings.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900">{warnings[0].title}</h4>
            <p className="text-xs text-amber-800/90 mt-0.5">{warnings[0].message}</p>
          </div>
          <span className="text-[10px] text-amber-700 font-mono shrink-0">
            {formatDate(warnings[0].timestamp)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Latest Recorded AQI"
          value={formatAQI(kpis.currentAqi)}
          subtitle={`Stored observation · ${observationDateLabel}`}
          icon={Activity}
          isDemo={false}
          trend={{
            direction: trendDirection,
            value: historicalTrendValue,
          }}
          badge={<CategoryBadge category={kpis.currentCategory} size="sm" />}
        />

        <StatusCard
          title="Average of Latest 14 Observations"
          value={formatAQI(kpis.historicalAverageAqi)}
          subtitle="Mean AQI across the latest available records"
          icon={Calendar}
          isDemo={false}
          trend={{
            direction: kpis.currentAqi > kpis.historicalAverageAqi
              ? 'up'
              : kpis.currentAqi < kpis.historicalAverageAqi
                ? 'down'
                : 'neutral',
            value: `${kpis.currentAqi > kpis.historicalAverageAqi ? '+' : ''}${formatAQI(kpis.currentAqi - kpis.historicalAverageAqi)} vs average`,
          }}
        />

        <StatusCard
          title="Latest Saved Prediction"
          value={predictedAqi === null ? 'Not available' : formatAQI(predictedAqi)}
          subtitle={predictedAqi === null
            ? 'No saved prediction exists for this city yet.'
            : `Stored model output${data.metadata.model_name ? ` · ${data.metadata.model_name}` : ''}; not a live reading.`}
          icon={Brain}
          isDemo={false}
        />

        <StatusCard
          title="High-AQI Cities"
          value={formatAQI(kpis.highRiskLocationsCount)}
          subtitle="Compared cities with latest recorded AQI above 200"
          icon={AlertTriangle}
          isDemo={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col">
          <AQIGauge
            aqi={kpis.currentAqi}
            category={kpis.currentCategory}
            standard="AQI Index (0–500)"
            subtitle={`Latest stored observation: ${observationDateLabel}. Historical data, not live telemetry.`}
            className="h-full"
          />
        </div>
        <div className="lg:col-span-2">
          <HistoricalAQIChart
            data={historicalSeries}
            title={`${selectedCity} — Latest 14 Recorded Observations`}
            subtitle="Historical AQI and pollutant measurements from the database. Dates reflect the stored records."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PollutantBarChart
          data={pollutantBreakdown}
          title={`${selectedCity} — Latest Stored Pollutant Measurements`}
        />
        <CategoryPieChart
          data={categoryDistribution}
          title="CPCB Categories Across Latest 14 Observations"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3 gap-3">
            <h3 className="text-sm md:text-base font-bold text-slate-900">
              City Comparison — Latest Stored AQI
            </h3>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">
              Historical records
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Most recent available database observation for each city in the comparison set; dates may differ by city.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="pb-2 text-slate-600">City</th>
                  <th className="pb-2 text-slate-600">AQI</th>
                  <th className="pb-2 text-slate-600">CPCB Category</th>
                  <th className="pb-2 text-slate-600">Pollutant</th>
                  <th className="pb-2 text-slate-600 text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cityComparisons.length > 0 ? cityComparisons.map((city) => (
                  <tr key={city.city} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-800">{city.city}</td>
                    <td className="py-2.5 font-mono font-extrabold text-slate-900">{formatAQI(city.aqi)}</td>
                    <td className="py-2.5">
                      <CategoryBadge category={city.category} size="sm" />
                    </td>
                    <td className="py-2.5 font-mono text-slate-600">{city.dominantPollutant || 'Not available'}</td>
                    <td className="py-2.5 text-right">
                      <TrendBadge trend={city.trend} size="sm" />
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No city comparison records are available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm md:text-base font-bold text-slate-900">
              Recent Saved Predictions
            </h3>
            <button
              onClick={() => navigate('/prediction')}
              className="text-xs text-teal-700 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Run Prediction</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Prediction records stored in PostgreSQL. These are model outputs, not new sensor observations.
          </p>

          <div className="space-y-3">
            {recentPredictions.length > 0 ? recentPredictions.map((prediction) => (
              <div
                key={prediction.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{prediction.city}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                      {prediction.horizon.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${prediction.isDemo
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-teal-50 text-teal-800 border-teal-200'}`}>
                      {prediction.isDemo ? 'Demo record' : 'Model record'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                    <span>Reference: <strong className="font-mono text-slate-700">{formatAQI(prediction.referenceAqi)}</strong></span>
                    <span aria-hidden="true">→</span>
                    <span>Predicted: <strong className="font-mono text-teal-700">{formatAQI(prediction.predictedAqi)}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>{formatTime(prediction.timestamp)}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <CategoryBadge category={prediction.category} size="sm" />
                  <RiskBadge level={prediction.risk} size="sm" showIcon={false} />
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                No predictions have been saved for the overview yet. Use Forecast AQI to create a model prediction.
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Data note: historical records are based on the observation dates stored in the database. A saved prediction is shown only when a prediction record exists; this dashboard does not claim to receive live sensor readings.
      </p>
    </div>
  );
};




// import React from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   Wind,
//   TrendingUp,
//   TrendingDown,
//   AlertTriangle,
//   Calendar,
//   Layers,
//   Brain,
//   ShieldAlert,
//   ArrowRight,
//   Activity,
//   CheckCircle2,
//   Clock,
//   Sparkles,
// } from 'lucide-react';
// import { useSelectedCity } from '../context/CityContext';
// import { useOverview } from '../hooks/useOverview';
// import { StatusCard } from '../components/common/StatusCard';
// import { AQIGauge } from '../components/common/AQIGauge';
// import { CategoryBadge } from '../components/common/CategoryBadge';
// import { TrendBadge } from '../components/common/TrendBadge';
// import { RiskBadge } from '../components/common/RiskBadge';
// import { HistoricalAQIChart } from '../components/charts/HistoricalAQIChart';
// import { PollutantBarChart } from '../components/charts/PollutantBarChart';
// import { CategoryPieChart } from '../components/charts/CategoryPieChart';
// import { LoadingState } from '../components/common/LoadingState';
// import { formatDate, formatTime } from '../lib/formatters';

// export const OverviewPage: React.FC = () => {
//   const navigate = useNavigate();
//   const { selectedCity } = useSelectedCity();
//   const { data, isLoading, error } = useOverview(selectedCity);

//   if (isLoading) {
//     return <LoadingState message={`Fetching real-time environmental telemetry for ${selectedCity}...`} />;
//   }

//   if (error || !data) {
//     return (
//       <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center">
//         <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
//         <h3 className="text-sm font-bold text-red-800">Telemetry Connection Error</h3>
//         <p className="text-xs text-red-600 mt-1">{error?.message || 'Failed to load telemetry.'}</p>
//       </div>
//     );
//   }

//   const { kpis, historicalSeries, pollutantBreakdown, categoryDistribution, cityComparisons, recentPredictions, warnings } = data;

//   return (
//     <div className="space-y-6">
//       {/* Page Header */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <div className="flex items-center gap-2">
//             <h1 className="text-2xl font-black text-slate-900 tracking-tight">
//               {selectedCity} Environmental Intelligence
//             </h1>
//             <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-semibold border border-teal-200">
//               Live Monitor
//             </span>
//           </div>
//           <p className="text-xs text-slate-500 mt-1">
//             Station overview, predictive trajectory modeling, and demographic exposure alerts
//           </p>
//         </div>

//         {/* Quick Action Navigation Buttons */}
//         <div className="flex items-center gap-2 flex-wrap">
//           <button
//             onClick={() => navigate('/prediction')}
//             className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 shadow-xs"
//           >
//             <Brain className="w-3.5 h-3.5" />
//             <span>Forecast AQI</span>
//           </button>
//           <button
//             onClick={() => navigate('/classification')}
//             className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs"
//           >
//             <Layers className="w-3.5 h-3.5" />
//             <span>Classify</span>
//           </button>
//           <button
//             onClick={() => navigate('/trends')}
//             className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs"
//           >
//             <TrendingUp className="w-3.5 h-3.5" />
//             <span>Trends</span>
//           </button>
//           <button
//             onClick={() => navigate('/risk')}
//             className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs"
//           >
//             <ShieldAlert className="w-3.5 h-3.5" />
//             <span>Health Risk</span>
//           </button>
//         </div>
//       </div>

//       {/* Warnings Banner if any */}
//       {warnings && warnings.length > 0 && (
//         <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
//           <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
//           <div className="flex-1">
//             <h4 className="text-xs font-bold text-amber-900">{warnings[0].title}</h4>
//             <p className="text-xs text-amber-800/90 mt-0.5">{warnings[0].message}</p>
//           </div>
//           <span className="text-[10px] text-amber-700 font-mono shrink-0">
//             {formatTime(warnings[0].timestamp)}
//           </span>
//         </div>
//       )}

//       {/* Top KPI Cards Grid */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         <StatusCard
//           title="Current AQI"
//           value={kpis.currentAqi}
//           subtitle={`Calibrated to US EPA standard`}
//           icon={Activity}
//           badge={<CategoryBadge category={kpis.currentCategory} size="sm" />}
//         />
//         <StatusCard
//           title="Historical 14D Avg"
//           value={kpis.historicalAverageAqi}
//           subtitle="Mean observation index"
//           icon={Calendar}
//           trend={{
//             direction: kpis.currentAqi > kpis.historicalAverageAqi ? 'up' : 'down',
//             value: `${kpis.currentAqi > kpis.historicalAverageAqi ? '+' : ''}${(kpis.currentAqi - kpis.historicalAverageAqi)} vs Avg`
//           }}
//         />
//         <StatusCard
//           title="Predicted Next Day"
//           value={kpis.predictedNextDayAqi}
//           subtitle="Simulated +24h projection"
//           icon={Brain}
//           badge={<TrendBadge trend={kpis.trend} delta={kpis.trendDelta} size="sm" />}
//         />
//         <StatusCard
//           title="Pollution Hotspots"
//           value={kpis.highRiskLocationsCount}
//           subtitle="Active sensor stations in region"
//           icon={AlertTriangle}
//           badge={
//             <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
//               Elevated Alert
//             </span>
//           }
//         />
//       </div>

//       {/* Main Visualizations: Gauge & Historical Profile */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         <div className="lg:col-span-1 flex flex-col">
//           <AQIGauge
//             aqi={kpis.currentAqi}
//             category={kpis.currentCategory}
//             standard="US EPA Standard"
//             subtitle={`${selectedCity} telemetry updated continuously`}
//             className="h-full"
//           />
//         </div>
//         <div className="lg:col-span-2">
//           <HistoricalAQIChart
//             data={historicalSeries}
//             title={`${selectedCity} 14-Day Ambient Air Quality History`}
//           />
//         </div>
//       </div>

//       {/* Pollutant Breakdown & Health Category Distribution */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         <PollutantBarChart
//           data={pollutantBreakdown}
//           title={`${selectedCity} Dominant Pollutants (µg/m³)`}
//         />
//         <CategoryPieChart
//           data={categoryDistribution}
//           title="14-Day Health Category Exposure Distribution"
//         />
//       </div>

//       {/* Multi-City Comparison & Recent Predictions */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* City Comparison Table */}
//         <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
//           <div className="flex items-center justify-between mb-3">
//             <h3 className="text-sm md:text-base font-bold text-slate-900">
//               National Metro Comparison
//             </h3>
//             <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">
//               Demo Network
//             </span>
//           </div>
//           <p className="text-xs text-slate-500 mb-4">Current telemetry cross-referenced across major Indian urban centers</p>

//           <div className="overflow-x-auto">
//             <table className="w-full text-left text-xs">
//               <thead>
//                 <tr className="border-b border-slate-200 text-slate-400 font-semibold">
//                   <th className="pb-2 text-slate-600">City</th>
//                   <th className="pb-2 text-slate-600">AQI</th>
//                   <th className="pb-2 text-slate-600">Category</th>
//                   <th className="pb-2 text-slate-600">Dominant</th>
//                   <th className="pb-2 text-slate-600 text-right">Trend</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {cityComparisons.map((c) => (
//                   <tr key={c.city} className="hover:bg-slate-50">
//                     <td className="py-2.5 font-bold text-slate-800">{c.city}</td>
//                     <td className="py-2.5 font-mono font-extrabold text-slate-900">{c.aqi}</td>
//                     <td className="py-2.5">
//                       <CategoryBadge category={c.category} size="sm" />
//                     </td>
//                     <td className="py-2.5 font-mono text-slate-600">{c.dominantPollutant}</td>
//                     <td className="py-2.5 text-right">
//                       <TrendBadge trend={c.trend} size="sm" />
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {/* Recently Generated Predictions */}
//         <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
//           <div className="flex items-center justify-between mb-3">
//             <h3 className="text-sm md:text-base font-bold text-slate-900">
//               Recent Model Inference Runs
//             </h3>
//             <button
//               onClick={() => navigate('/prediction')}
//               className="text-xs text-teal-700 font-semibold hover:underline flex items-center gap-1"
//             >
//               <span>New Run</span>
//               <ArrowRight className="w-3 h-3" />
//             </button>
//           </div>
//           <p className="text-xs text-slate-500 mb-4">Audit log of recent regression and trajectory predictions</p>

//           <div className="space-y-3">
//             {recentPredictions.map((pred) => (
//               <div
//                 key={pred.id}
//                 className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 text-xs"
//               >
//                 <div>
//                   <div className="flex items-center gap-2">
//                     <span className="font-bold text-slate-900">{pred.city}</span>
//                     <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono">
//                       {pred.horizon}
//                     </span>
//                   </div>
//                   <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
//                     <span>Ref: <strong className="font-mono text-slate-700">{pred.referenceAqi}</strong></span>
//                     <span>&rarr;</span>
//                     <span>Pred: <strong className="font-mono text-teal-700">{pred.predictedAqi}</strong></span>
//                     <span className="text-slate-300">•</span>
//                     <span>{formatTime(pred.timestamp)}</span>
//                   </div>
//                 </div>

//                 <div className="flex flex-col items-end gap-1">
//                   <CategoryBadge category={pred.category} size="sm" />
//                   <RiskBadge level={pred.risk} size="sm" showIcon={false} />
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
