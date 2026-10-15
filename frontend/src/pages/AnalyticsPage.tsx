
import React, { useState } from 'react';
import { Calendar, Activity } from 'lucide-react';

import { useAnalytics } from '../hooks/useAnalytics';
import { useCities } from '../hooks/useOverview';
import { StatusCard } from '../components/common/StatusCard';
import { CorrelationHeatmap } from '../components/charts/CorrelationHeatmap';
import { DiurnalPatternChart } from '../components/charts/DiurnalPatternChart';
import { LoadingState } from '../components/common/LoadingState';

export const AnalyticsPage: React.FC = () => {
  const [filterCity, setFilterCity] = useState<string>('All Cities');

  // Get the city list from the backend API.
  const {
    data: cities = [],
    isLoading: isCitiesLoading,
  } = useCities();

  // Fetch analytics from the database-backed API.
  const { data, isLoading, error } = useAnalytics(filterCity);

  if (isLoading) {
    return (
      <LoadingState message="Loading analytics from historical AQI records..." />
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        Unable to load analytics. {error.message}
      </div>
    );
  }

  if (!data) {
    return <LoadingState message="Preparing analytics..." />;
  }

  const {
    summary,
    seasonalPatterns,
    diurnalProfile,
    correlationMatrix,
    citySummaries,
  } = data;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Environmental Statistical Analytics
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Statistical analysis of historical AQI, pollutant concentrations,
            seasonal patterns, and available weather observations.
          </p>
        </div>

        {/* Dynamic city filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="analytics-city-filter"
            className="text-xs font-medium text-slate-600"
          >
            Region
          </label>

          <select
            id="analytics-city-filter"
            value={filterCity}
            onChange={(event) => setFilterCity(event.target.value)}
            disabled={isCitiesLoading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs focus:border-teal-600 focus:outline-none"
          >
            <option value="All Cities">All Cities Combined</option>

            {cities.map((city) => (
              <option key={city.id} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistical KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatusCard
          title="Mean AQI"
          value={summary.meanAqi.toFixed(1)}
          subtitle="Average of stored observations"
          icon={Activity}
        />

        <StatusCard
          title="Median AQI"
          value={summary.medianAqi.toFixed(1)}
          subtitle="50th percentile"
          icon={Activity}
        />

        <StatusCard
          title="Standard Deviation"
          value={`±${summary.stdAqi.toFixed(1)}`}
          subtitle="Spread of AQI values"
          icon={Activity}
        />

        <StatusCard
          title="Clean AQI Records"
          value={summary.cleanAirDays}
          subtitle={`AQI ≤ 50 out of ${summary.totalRecords} records`}
          icon={Calendar}
        />
      </div>

      {/* Correlation matrix and hourly profile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CorrelationHeatmap data={correlationMatrix} />

        {diurnalProfile.length > 0 ? (
          <DiurnalPatternChart data={diurnalProfile} />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="mb-1 text-sm font-bold text-slate-900">
              Hourly Pollution Profile
            </h3>

            <p className="text-xs leading-5 text-slate-500">
              Hourly measurements are not available in the current daily
              dataset. This chart can be populated when hourly observations
              become available.
            </p>
          </div>
        )}
      </div>

      {/* Seasonal statistics and regional comparisons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Seasonal patterns */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <h3 className="mb-1 text-sm font-bold text-slate-900">
            Seasonal Patterns
          </h3>

          <p className="mb-4 text-xs text-slate-500">
            AQI and available weather measurements grouped by season.
          </p>

          <div className="space-y-3">
            {seasonalPatterns.map((season) => (
              <div
                key={season.season}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-3 font-bold text-slate-800">
                  <span>{season.season}</span>

                  <span className="font-mono text-sm font-black text-teal-800">
                    {season.averageAqi.toFixed(1)} AQI
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  <span>
                    PM2.5:{' '}
                    <strong className="font-mono text-slate-700">
                      {season.avgPm25.toFixed(1)} µg/m³
                    </strong>
                  </span>

                  <span>
                    Average temperature:{' '}
                    <strong className="font-mono text-slate-700">
                      {season.avgTemp.toFixed(1)}°C
                    </strong>
                  </span>

                  <span>
                    Pollutant information:{' '}
                    <strong className="font-mono text-slate-700">
                      {season.dominantPollutant}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* City summaries */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <h3 className="mb-1 text-sm font-bold text-slate-900">
            Regional Statistical Overview
          </h3>

          <p className="mb-4 text-xs text-slate-500">
            Statistics calculated from stored observations for each city.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 font-semibold text-slate-500">
                  <th className="pb-2 text-slate-600">Region</th>
                  <th className="pb-2 text-slate-600">Mean</th>
                  <th className="pb-2 text-slate-600">Range</th>
                  <th className="pb-2 text-slate-600">Pollutant info</th>
                  <th className="pb-2 text-slate-600">Classification</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {citySummaries.map((city) => (
                  <tr key={city.city} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-800">
                      {city.city}
                    </td>

                    <td className="py-2.5 font-mono font-bold text-slate-900">
                      {city.avgAqi.toFixed(1)}
                    </td>

                    <td className="py-2.5 font-mono text-[11px] text-slate-500">
                      {city.minAqi.toFixed(1)} – {city.maxAqi.toFixed(1)}
                    </td>

                    <td className="py-2.5 text-slate-600">
                      {city.dominantPollutant}
                    </td>

                    <td className="py-2.5 text-[11px] text-slate-500">
                      {city.status}
                    </td>
                  </tr>
                ))}

                {citySummaries.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-slate-500"
                    >
                      No city observations found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};




// import React, { useState } from 'react';
// import {
//   BarChart3,
//   Calendar,
//   Layers,
//   Thermometer,
//   Wind,
//   Droplets,
//   Activity,
//   FileSpreadsheet,
// } from 'lucide-react';
// import { useAnalytics } from '../hooks/useAnalytics';
// import { useSelectedCity } from '../context/CityContext';
// import { StatusCard } from '../components/common/StatusCard';
// import { CorrelationHeatmap } from '../components/charts/CorrelationHeatmap';
// import { DiurnalPatternChart } from '../components/charts/DiurnalPatternChart';
// import { DemoBadge } from '../components/common/DemoBadge';
// import { LoadingState } from '../components/common/LoadingState';

// export const AnalyticsPage: React.FC = () => {
//   const { selectedCity } = useSelectedCity();
//   const [filterCity, setFilterCity] = useState<string>('All Cities');
//   const { data, isLoading } = useAnalytics(filterCity);

//   if (isLoading || !data) {
//     return <LoadingState message="Aggregating atmospheric statistical models..." />;
//   }

//   const { summary, seasonalPatterns, diurnalProfile, correlationMatrix, citySummaries } = data;

//   return (
//     <div className="space-y-6">
//       {/* Title */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div>
//           <div className="flex items-center gap-2">
//             <h1 className="text-2xl font-black text-slate-900 tracking-tight">
//               Environmental Statistical Analytics
//             </h1>
//             <DemoBadge variant="subtle" />
//           </div>
//           <p className="text-xs text-slate-500 mt-1">
//             Multivariate statistical metrics, seasonal cyclicality, diurnal profiles, and chemical cross-correlations
//           </p>
//         </div>

//         {/* City Filter */}
//         <div className="flex items-center gap-2">
//           <select
//             value={filterCity}
//             onChange={(e) => setFilterCity(e.target.value)}
//             className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:border-teal-600 focus:outline-none shadow-2xs"
//           >
//             <option value="All Cities">All Cities Combined</option>
//             <option value="Delhi">Delhi</option>
//             <option value="Mumbai">Mumbai</option>
//             <option value="Pune">Pune</option>
//             <option value="Bengaluru">Bengaluru</option>
//             <option value="Chennai">Chennai</option>
//             <option value="Hyderabad">Hyderabad</option>
//           </select>
//         </div>
//       </div>

//       {/* KPI Stats Strip */}
//       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//         <StatusCard
//           title="Mean AQI"
//           value={summary.meanAqi.toFixed(1)}
//           subtitle="Dataset mean concentration"
//           icon={Activity}
//         />
//         <StatusCard
//           title="Median AQI"
//           value={summary.medianAqi.toFixed(1)}
//           subtitle="50th percentile baseline"
//           icon={Activity}
//         />
//         <StatusCard
//           title="Std Deviation"
//           value={`±${summary.stdAqi.toFixed(1)}`}
//           subtitle="Variance spread"
//           icon={Activity}
//         />
//         <StatusCard
//           title="Clean Air Days"
//           value={summary.cleanAirDays}
//           subtitle={`Out of ${summary.totalRecords} sampled`}
//           icon={Calendar}
//         />
//       </div>

//       {/* Correlation Matrix & 24h Diurnal Profile */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         <CorrelationHeatmap data={correlationMatrix} />
//         <DiurnalPatternChart data={diurnalProfile} />
//       </div>

//       {/* Seasonal Cycles & Metro Summaries */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Seasonal Patterns */}
//         <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
//           <h3 className="text-sm font-bold text-slate-900 mb-1">
//             Seasonal Climatological Cycles
//           </h3>
//           <p className="text-xs text-slate-500 mb-4">Quarterly meteorological impacts on particulate accumulation</p>

//           <div className="space-y-3">
//             {seasonalPatterns.map((s) => (
//               <div key={s.season} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
//                 <div className="flex items-center justify-between font-bold text-slate-800">
//                   <span>{s.season}</span>
//                   <span className="font-mono text-teal-800 text-sm font-black">
//                     {s.averageAqi} AQI
//                   </span>
//                 </div>
//                 <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
//                   <span>PM2.5: <strong className="font-mono text-slate-700">{s.avgPm25} µg/m³</strong></span>
//                   <span>Avg Temp: <strong className="font-mono text-slate-700">{s.avgTemp}°C</strong></span>
//                   <span>Primary Driver: <strong className="font-mono text-slate-700">{s.dominantPollutant}</strong></span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* City Summaries */}
//         <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
//           <h3 className="text-sm font-bold text-slate-900 mb-1">
//             Regional Statistical Overview
//           </h3>
//           <p className="text-xs text-slate-500 mb-4">Station statistics aggregated by metropolitan region</p>

//           <div className="overflow-x-auto">
//             <table className="w-full text-left text-xs">
//               <thead>
//                 <tr className="border-b border-slate-200 text-slate-500 font-semibold">
//                   <th className="pb-2 text-slate-600">Region</th>
//                   <th className="pb-2 text-slate-600">Mean</th>
//                   <th className="pb-2 text-slate-600">Range</th>
//                   <th className="pb-2 text-slate-600">Primary</th>
//                   <th className="pb-2 text-slate-600">Classification</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {citySummaries.map((c) => (
//                   <tr key={c.city} className="hover:bg-slate-50">
//                     <td className="py-2.5 font-bold text-slate-800">{c.city}</td>
//                     <td className="py-2.5 font-mono font-bold text-slate-900">{c.avgAqi.toFixed(1)}</td>
//                     <td className="py-2.5 font-mono text-slate-500 text-[11px]">{c.minAqi} – {c.maxAqi}</td>
//                     <td className="py-2.5 font-mono text-slate-600">{c.dominantPollutant}</td>
//                     <td className="py-2.5 text-slate-500 text-[11px]">{c.status}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
