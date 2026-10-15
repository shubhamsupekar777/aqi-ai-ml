import React, { useState } from 'react';
import { AlertTriangle, Database, Info, Layers, MapPin } from 'lucide-react';
import { useSelectedCity } from '../context/CityContext';
import { useClassification } from '../hooks/useClassification';
import type { ClassificationResponse } from '../types/classification';
import { LoadingState } from '../components/common/LoadingState';
import { formatDate, formatTime } from '../lib/formatters';

const CPCB_COLORS: Record<string, string> = {
  Good: '#10B981',
  Satisfactory: '#84CC16',
  Moderate: '#F59E0B',
  Poor: '#F97316',
  'Very Poor': '#EF4444',
  Severe: '#881337',
};

export const AirQualityClassificationPage: React.FC = () => {
  const { selectedCity } = useSelectedCity();
  const classificationMutation = useClassification();
  const [result, setResult] = useState<ClassificationResponse | null>(null);

  // The city selector in the global top bar is the single source of city selection.
  // Clear an old result when that selected city changes.
  React.useEffect(() => {
    setResult(null);
    classificationMutation.reset();
  }, [selectedCity]);

  const classifySelectedCity = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);
    classificationMutation.mutate(
      { city: selectedCity },
      { onSuccess: (data) => setResult(data) },
    );
  };

  const sortedDistribution = result
    ? [...result.categoryDistribution].sort((a, b) => b.count - a.count)
    : [];

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Air Quality Classification
          </h1>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
            Random Forest · CPCB
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Classify the latest stored city observation using pollutant, weather, location, calendar and historical features.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
        <p>
          This page uses the trained CPCB bucket classifier. The numerical AQI shown in the result is the stored observation for context and is not passed into the classifier. Historical records may not represent current live conditions.
        </p>
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs xl:col-span-4">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Layers className="h-4 w-4 text-teal-700" />
              Classification Input
            </h2>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
              Database-backed
            </span>
          </div>

          <form onSubmit={classifySelectedCity} className="space-y-4">
            <div>
              <p className="mb-1 block text-xs font-semibold text-slate-700">Selected city</p>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-teal-700" />
                <span className="text-xs font-semibold text-slate-800">{selectedCity}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Change the region using the city selector in the top bar.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Database className="h-4 w-4 text-teal-700" />
                Model feature source
              </div>
              <p className="mt-1">
                The backend loads the latest stored pollutant and weather record plus the previous AQI observations for the selected city. Missing values are handled by the trained preprocessing pipeline.
              </p>
            </div>

            <button
              type="submit"
              disabled={classificationMutation.isPending || !selectedCity}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {classificationMutation.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Classifying stored observation…
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4" />
                  Classify latest observation
                </>
              )}
            </button>
          </form>

          {classificationMutation.error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">Classification failed</p>
                <p className="mt-0.5 break-words">{classificationMutation.error.message}</p>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-6 xl:col-span-8">
          {classificationMutation.isPending && (
            <LoadingState message="Running the trained CPCB classification model…" />
          )}

          {!result && !classificationMutation.isPending && !classificationMutation.error && (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <Layers className="h-9 w-9 text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-800">Ready to classify</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Select a city and run classification to load its latest stored observation into the trained model.
              </p>
            </div>
          )}

          {result && !classificationMutation.isPending && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs" style={{ borderLeftWidth: 6, borderLeftColor: result.color }}>
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Predicted CPCB category</p>
                    <h2 className="mt-1 text-2xl font-black" style={{ color: result.color }}>{result.category}</h2>
                    <p className="mt-1 text-xs text-slate-500">{result.city} · Observation date {formatDate(result.observationDate)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-4 py-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Stored AQI · context</p>
                    <p className="mt-1 font-mono text-3xl font-black text-slate-900">{Math.round(result.aqi)}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900">Health statement</h3>
                    <p className="mt-1 text-slate-600">{result.healthStatement}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Cautionary guidance</h3>
                    <p className="mt-1 text-slate-600">{result.cautionaryStatement}</p>
                  </div>
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 leading-relaxed text-slate-600">{result.explanation}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                  <span>Model: <strong className="font-mono text-slate-700">{result.metadata.model_name ?? 'Unknown'}</strong></span>
                  <span>Source: {result.metadata.data_source} · Demo: {result.metadata.is_demo ? 'Yes' : 'No'}</span>
                  <span>Run at {formatTime(result.metadata.timestamp)}</span>
                </div>
              </div>


            </>
          )}
        </div>
      </div>

      {result && !classificationMutation.isPending && (
        <div className="w-full min-w-0 space-y-6">
          <div className={`grid w-full min-w-0 grid-cols-1 items-start gap-4 ${result.probabilities && result.probabilities.length > 0 ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
                        {result.probabilities && result.probabilities.length > 0 && (
                          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                            <h3 className="text-sm font-bold text-slate-900">Random Forest class scores</h3>
                            <p className="mb-4 mt-1 text-xs text-slate-500">Vote-based scores from the model; these are not calibrated health-risk probabilities.</p>
                            <div className="space-y-3">
                              {result.probabilities.map((item) => (
                                <div key={item.category}>
                                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                    <span className="font-medium text-slate-700">{item.category}</span>
                                    <span className="font-mono text-slate-500">{(item.probability * 100).toFixed(1)}%</span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, item.probability * 100))}%`, backgroundColor: CPCB_COLORS[item.category] ?? '#64748B' }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
          
                        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                          <h3 className="text-sm font-bold text-slate-900">Category distribution in latest stored observations</h3>
                          <p className="mb-4 mt-1 text-xs text-slate-500">Frequency across the latest {result.history.length > 0 ? Math.min(14, result.categoryDistribution.reduce((sum, item) => sum + item.count, 0)) : 0} observations for {result.city}; this is historical data, not model confidence.</p>
                          <div className="space-y-3">
                            {sortedDistribution.map((item) => (
                              <div key={item.category}>
                                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                  <span className="flex items-center gap-2 font-medium text-slate-700">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    {item.category}
                                  </span>
                                  <span className="font-mono text-slate-500">{item.count} · {item.percentage}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                  <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        </div>
          
                        <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-slate-900">Recent historical observations</h3>
                            <span className="text-[10px] font-mono text-slate-400">Stored history</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {result.history.map((item) => (
                              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                                <div>
                                  <span className="font-semibold text-slate-800">{item.city}</span>
                                  <span className="ml-2 font-mono text-slate-600">AQI {Math.round(item.aqi)}</span>
                                  <p className="mt-0.5 text-[11px] text-slate-500">{formatDate(item.timestamp)}</p>
                                </div>
                                <span className="rounded-full border px-2.5 py-1 font-semibold" style={{ color: CPCB_COLORS[item.category] ?? '#475569', borderColor: CPCB_COLORS[item.category] ?? '#CBD5E1', backgroundColor: `${CPCB_COLORS[item.category] ?? '#64748B'}15` }}>
                                  {item.category}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
        </div>
      )}
    </div>
  );
};



// import React, { useState } from 'react';
// import { AlertTriangle, Database, Info, Layers, MapPin } from 'lucide-react';
// import { useSelectedCity } from '../context/CityContext';
// import { useClassification } from '../hooks/useClassification';
// import type { ClassificationResponse } from '../types/classification';
// import { LoadingState } from '../components/common/LoadingState';
// import { formatDate, formatTime } from '../lib/formatters';

// const CPCB_COLORS: Record<string, string> = {
//   Good: '#10B981',
//   Satisfactory: '#84CC16',
//   Moderate: '#F59E0B',
//   Poor: '#F97316',
//   'Very Poor': '#EF4444',
//   Severe: '#881337',
// };

// export const AirQualityClassificationPage: React.FC = () => {
//   const { selectedCity } = useSelectedCity();
//   const classificationMutation = useClassification();
//   const [result, setResult] = useState<ClassificationResponse | null>(null);

//   // The city selector in the global top bar is the single source of city selection.
//   // Clear an old result when that selected city changes.
//   React.useEffect(() => {
//     setResult(null);
//     classificationMutation.reset();
//   }, [selectedCity]);

//   const classifySelectedCity = (event: React.FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     setResult(null);
//     classificationMutation.mutate(
//       { city: selectedCity },
//       { onSuccess: (data) => setResult(data) },
//     );
//   };

//   const sortedDistribution = result
//     ? [...result.categoryDistribution].sort((a, b) => b.count - a.count)
//     : [];

//   return (
//     <div className="w-full min-w-0 space-y-6">
//       <div>
//         <div className="flex flex-wrap items-center gap-2">
//           <h1 className="text-2xl font-black tracking-tight text-slate-900">
//             Air Quality Classification
//           </h1>
//           <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
//             Random Forest · CPCB
//           </span>
//         </div>
//         <p className="mt-1 text-xs text-slate-500">
//           Classify the latest stored city observation using pollutant, weather, location, calendar and historical features.
//         </p>
//       </div>

//       <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900">
//         <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
//         <p>
//           This page uses the trained CPCB bucket classifier. The numerical AQI shown in the result is the stored observation for context and is not passed into the classifier. Historical records may not represent current live conditions.
//         </p>
//       </div>

//       <div className="grid w-full min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-12">
//         <div className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs xl:col-span-4">
//           <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
//             <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
//               <Layers className="h-4 w-4 text-teal-700" />
//               Classification Input
//             </h2>
//             <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
//               Database-backed
//             </span>
//           </div>

//           <form onSubmit={classifySelectedCity} className="space-y-4">
//             <div>
//               <p className="mb-1 block text-xs font-semibold text-slate-700">Selected city</p>
//               <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
//                 <MapPin className="h-4 w-4 shrink-0 text-teal-700" />
//                 <span className="text-xs font-semibold text-slate-800">{selectedCity}</span>
//               </div>
//               <p className="mt-1 text-[11px] text-slate-500">
//                 Change the region using the city selector in the top bar.
//               </p>
//             </div>

//             <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
//               <div className="flex items-center gap-2 font-semibold text-slate-800">
//                 <Database className="h-4 w-4 text-teal-700" />
//                 Model feature source
//               </div>
//               <p className="mt-1">
//                 The backend loads the latest stored pollutant and weather record plus the previous AQI observations for the selected city. Missing values are handled by the trained preprocessing pipeline.
//               </p>
//             </div>

//             <button
//               type="submit"
//               disabled={classificationMutation.isPending || !selectedCity}
//               className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
//             >
//               {classificationMutation.isPending ? (
//                 <>
//                   <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
//                   Classifying stored observation…
//                 </>
//               ) : (
//                 <>
//                   <Layers className="h-4 w-4" />
//                   Classify latest observation
//                 </>
//               )}
//             </button>
//           </form>

//           {classificationMutation.error && (
//             <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
//               <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
//               <div>
//                 <p className="font-bold">Classification failed</p>
//                 <p className="mt-0.5 break-words">{classificationMutation.error.message}</p>
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="min-w-0 space-y-6 xl:col-span-8">
//           {classificationMutation.isPending && (
//             <LoadingState message="Running the trained CPCB classification model…" />
//           )}

//           {!result && !classificationMutation.isPending && !classificationMutation.error && (
//             <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
//               <Layers className="h-9 w-9 text-slate-300" />
//               <h3 className="mt-3 text-sm font-bold text-slate-800">Ready to classify</h3>
//               <p className="mt-1 max-w-sm text-xs text-slate-500">
//                 Select a city and run classification to load its latest stored observation into the trained model.
//               </p>
//             </div>
//           )}

//           {result && !classificationMutation.isPending && (
//             <>
//               <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs" style={{ borderLeftWidth: 6, borderLeftColor: result.color }}>
//                 <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
//                   <div>
//                     <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Predicted CPCB category</p>
//                     <h2 className="mt-1 text-2xl font-black" style={{ color: result.color }}>{result.category}</h2>
//                     <p className="mt-1 text-xs text-slate-500">{result.city} · Observation date {formatDate(result.observationDate)}</p>
//                   </div>
//                   <div className="rounded-lg bg-slate-50 px-4 py-3 text-center">
//                     <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Stored AQI · context</p>
//                     <p className="mt-1 font-mono text-3xl font-black text-slate-900">{Math.round(result.aqi)}</p>
//                   </div>
//                 </div>

//                 <div className="mt-4 space-y-3 text-xs">
//                   <div>
//                     <h3 className="font-bold text-slate-900">Health statement</h3>
//                     <p className="mt-1 text-slate-600">{result.healthStatement}</p>
//                   </div>
//                   <div>
//                     <h3 className="font-bold text-slate-900">Cautionary guidance</h3>
//                     <p className="mt-1 text-slate-600">{result.cautionaryStatement}</p>
//                   </div>
//                   <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 leading-relaxed text-slate-600">{result.explanation}</p>
//                 </div>

//                 <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
//                   <span>Model: <strong className="font-mono text-slate-700">{result.metadata.model_name ?? 'Unknown'}</strong></span>
//                   <span>Source: {result.metadata.data_source} · Demo: {result.metadata.is_demo ? 'Yes' : 'No'}</span>
//                   <span>Run at {formatTime(result.metadata.timestamp)}</span>
//                 </div>
//               </div>

//               <div className="grid w-full min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2">
//               {result.probabilities && result.probabilities.length > 0 && (
//                 <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//                   <h3 className="text-sm font-bold text-slate-900">Random Forest class scores</h3>
//                   <p className="mb-4 mt-1 text-xs text-slate-500">Vote-based scores from the model; these are not calibrated health-risk probabilities.</p>
//                   <div className="space-y-3">
//                     {result.probabilities.map((item) => (
//                       <div key={item.category}>
//                         <div className="mb-1 flex items-center justify-between gap-2 text-xs">
//                           <span className="font-medium text-slate-700">{item.category}</span>
//                           <span className="font-mono text-slate-500">{(item.probability * 100).toFixed(1)}%</span>
//                         </div>
//                         <div className="h-2 overflow-hidden rounded-full bg-slate-100">
//                           <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, item.probability * 100))}%`, backgroundColor: CPCB_COLORS[item.category] ?? '#64748B' }} />
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//                 <h3 className="text-sm font-bold text-slate-900">Category distribution in latest stored observations</h3>
//                 <p className="mb-4 mt-1 text-xs text-slate-500">Frequency across the latest {result.history.length > 0 ? Math.min(14, result.categoryDistribution.reduce((sum, item) => sum + item.count, 0)) : 0} observations for {result.city}; this is historical data, not model confidence.</p>
//                 <div className="space-y-3">
//                   {sortedDistribution.map((item) => (
//                     <div key={item.category}>
//                       <div className="mb-1 flex items-center justify-between gap-2 text-xs">
//                         <span className="flex items-center gap-2 font-medium text-slate-700">
//                           <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
//                           {item.category}
//                         </span>
//                         <span className="font-mono text-slate-500">{item.count} · {item.percentage}%</span>
//                       </div>
//                       <div className="h-2 overflow-hidden rounded-full bg-slate-100">
//                         <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//               </div>

//               <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//                 <div className="mb-3 flex items-center justify-between gap-2">
//                   <h3 className="text-sm font-bold text-slate-900">Recent historical observations</h3>
//                   <span className="text-[10px] font-mono text-slate-400">Stored history</span>
//                 </div>
//                 <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
//                   {result.history.map((item) => (
//                     <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
//                       <div>
//                         <span className="font-semibold text-slate-800">{item.city}</span>
//                         <span className="ml-2 font-mono text-slate-600">AQI {Math.round(item.aqi)}</span>
//                         <p className="mt-0.5 text-[11px] text-slate-500">{formatDate(item.timestamp)}</p>
//                       </div>
//                       <span className="rounded-full border px-2.5 py-1 font-semibold" style={{ color: CPCB_COLORS[item.category] ?? '#475569', borderColor: CPCB_COLORS[item.category] ?? '#CBD5E1', backgroundColor: `${CPCB_COLORS[item.category] ?? '#64748B'}15` }}>
//                         {item.category}
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };


// import React, { useState } from 'react';
// import { AlertTriangle, Database, Info, Layers, MapPin } from 'lucide-react';
// import { useSelectedCity } from '../context/CityContext';
// import { useClassification } from '../hooks/useClassification';
// import type { ClassificationResponse } from '../types/classification';
// import { LoadingState } from '../components/common/LoadingState';
// import { formatDate, formatTime } from '../lib/formatters';

// const CPCB_COLORS: Record<string, string> = {
//   Good: '#10B981',
//   Satisfactory: '#84CC16',
//   Moderate: '#F59E0B',
//   Poor: '#F97316',
//   'Very Poor': '#EF4444',
//   Severe: '#881337',
// };

// export const AirQualityClassificationPage: React.FC = () => {
//   const { selectedCity } = useSelectedCity();
//   const classificationMutation = useClassification();
//   const [result, setResult] = useState<ClassificationResponse | null>(null);

//   // The city selector in the global top bar is the single source of city selection.
//   // Clear an old result when that selected city changes.
//   React.useEffect(() => {
//     setResult(null);
//     classificationMutation.reset();
//   }, [selectedCity]);

//   const classifySelectedCity = (event: React.FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     setResult(null);
//     classificationMutation.mutate(
//       { city: selectedCity },
//       { onSuccess: (data) => setResult(data) },
//     );
//   };

//   const sortedDistribution = result
//     ? [...result.categoryDistribution].sort((a, b) => b.count - a.count)
//     : [];

//   return (
//     <div className="space-y-6">
//       <div>
//         <div className="flex flex-wrap items-center gap-2">
//           <h1 className="text-2xl font-black tracking-tight text-slate-900">
//             Air Quality Classification
//           </h1>
//           <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
//             Random Forest · CPCB
//           </span>
//         </div>
//         <p className="mt-1 text-xs text-slate-500">
//           Classify the latest stored city observation using pollutant, weather, location, calendar and historical features.
//         </p>
//       </div>

//       <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900">
//         <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
//         <p>
//           This page uses the trained CPCB bucket classifier. The numerical AQI shown in the result is the stored observation for context and is not passed into the classifier. Historical records may not represent current live conditions.
//         </p>
//       </div>

//       <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
//         <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs lg:col-span-5">
//           <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
//             <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
//               <Layers className="h-4 w-4 text-teal-700" />
//               Classification Input
//             </h2>
//             <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
//               Database-backed
//             </span>
//           </div>

//           <form onSubmit={classifySelectedCity} className="space-y-4">
//             <div>
//               <p className="mb-1 block text-xs font-semibold text-slate-700">Selected city</p>
//               <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
//                 <MapPin className="h-4 w-4 shrink-0 text-teal-700" />
//                 <span className="text-xs font-semibold text-slate-800">{selectedCity}</span>
//               </div>
//               <p className="mt-1 text-[11px] text-slate-500">
//                 Change the region using the city selector in the top bar.
//               </p>
//             </div>

//             <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
//               <div className="flex items-center gap-2 font-semibold text-slate-800">
//                 <Database className="h-4 w-4 text-teal-700" />
//                 Model feature source
//               </div>
//               <p className="mt-1">
//                 The backend loads the latest stored pollutant and weather record plus the previous AQI observations for the selected city. Missing values are handled by the trained preprocessing pipeline.
//               </p>
//             </div>

//             <button
//               type="submit"
//               disabled={classificationMutation.isPending || !selectedCity}
//               className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
//             >
//               {classificationMutation.isPending ? (
//                 <>
//                   <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
//                   Classifying stored observation…
//                 </>
//               ) : (
//                 <>
//                   <Layers className="h-4 w-4" />
//                   Classify latest observation
//                 </>
//               )}
//             </button>
//           </form>

//           {classificationMutation.error && (
//             <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
//               <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
//               <div>
//                 <p className="font-bold">Classification failed</p>
//                 <p className="mt-0.5 break-words">{classificationMutation.error.message}</p>
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="space-y-6 lg:col-span-7">
//           {classificationMutation.isPending && (
//             <LoadingState message="Running the trained CPCB classification model…" />
//           )}

//           {!result && !classificationMutation.isPending && !classificationMutation.error && (
//             <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
//               <Layers className="h-9 w-9 text-slate-300" />
//               <h3 className="mt-3 text-sm font-bold text-slate-800">Ready to classify</h3>
//               <p className="mt-1 max-w-sm text-xs text-slate-500">
//                 Select a city and run classification to load its latest stored observation into the trained model.
//               </p>
//             </div>
//           )}

//           {result && !classificationMutation.isPending && (
//             <>
//               <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs" style={{ borderLeftWidth: 6, borderLeftColor: result.color }}>
//                 <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
//                   <div>
//                     <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Predicted CPCB category</p>
//                     <h2 className="mt-1 text-2xl font-black" style={{ color: result.color }}>{result.category}</h2>
//                     <p className="mt-1 text-xs text-slate-500">{result.city} · Observation date {formatDate(result.observationDate)}</p>
//                   </div>
//                   <div className="rounded-lg bg-slate-50 px-4 py-3 text-center">
//                     <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Stored AQI · context</p>
//                     <p className="mt-1 font-mono text-3xl font-black text-slate-900">{Math.round(result.aqi)}</p>
//                   </div>
//                 </div>

//                 <div className="mt-4 space-y-3 text-xs">
//                   <div>
//                     <h3 className="font-bold text-slate-900">Health statement</h3>
//                     <p className="mt-1 text-slate-600">{result.healthStatement}</p>
//                   </div>
//                   <div>
//                     <h3 className="font-bold text-slate-900">Cautionary guidance</h3>
//                     <p className="mt-1 text-slate-600">{result.cautionaryStatement}</p>
//                   </div>
//                   <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 leading-relaxed text-slate-600">{result.explanation}</p>
//                 </div>

//                 <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
//                   <span>Model: <strong className="font-mono text-slate-700">{result.metadata.model_name ?? 'Unknown'}</strong></span>
//                   <span>Source: {result.metadata.data_source} · Demo: {result.metadata.is_demo ? 'Yes' : 'No'}</span>
//                   <span>Run at {formatTime(result.metadata.timestamp)}</span>
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
//               {result.probabilities && result.probabilities.length > 0 && (
//                 <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//                   <h3 className="text-sm font-bold text-slate-900">Random Forest class scores</h3>
//                   <p className="mb-4 mt-1 text-xs text-slate-500">Vote-based scores from the model; these are not calibrated health-risk probabilities.</p>
//                   <div className="space-y-3">
//                     {result.probabilities.map((item) => (
//                       <div key={item.category}>
//                         <div className="mb-1 flex items-center justify-between gap-2 text-xs">
//                           <span className="font-medium text-slate-700">{item.category}</span>
//                           <span className="font-mono text-slate-500">{(item.probability * 100).toFixed(1)}%</span>
//                         </div>
//                         <div className="h-2 overflow-hidden rounded-full bg-slate-100">
//                           <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, item.probability * 100))}%`, backgroundColor: CPCB_COLORS[item.category] ?? '#64748B' }} />
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//                 <h3 className="text-sm font-bold text-slate-900">Category distribution in latest stored observations</h3>
//                 <p className="mb-4 mt-1 text-xs text-slate-500">Frequency across the latest {result.history.length > 0 ? Math.min(14, result.categoryDistribution.reduce((sum, item) => sum + item.count, 0)) : 0} observations for {result.city}; this is historical data, not model confidence.</p>
//                 <div className="space-y-3">
//                   {sortedDistribution.map((item) => (
//                     <div key={item.category}>
//                       <div className="mb-1 flex items-center justify-between gap-2 text-xs">
//                         <span className="flex items-center gap-2 font-medium text-slate-700">
//                           <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
//                           {item.category}
//                         </span>
//                         <span className="font-mono text-slate-500">{item.count} · {item.percentage}%</span>
//                       </div>
//                       <div className="h-2 overflow-hidden rounded-full bg-slate-100">
//                         <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//               </div>

//               <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//                 <div className="mb-3 flex items-center justify-between gap-2">
//                   <h3 className="text-sm font-bold text-slate-900">Recent historical observations</h3>
//                   <span className="text-[10px] font-mono text-slate-400">Stored history</span>
//                 </div>
//                 <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
//                   {result.history.map((item) => (
//                     <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
//                       <div>
//                         <span className="font-semibold text-slate-800">{item.city}</span>
//                         <span className="ml-2 font-mono text-slate-600">AQI {Math.round(item.aqi)}</span>
//                         <p className="mt-0.5 text-[11px] text-slate-500">{formatDate(item.timestamp)}</p>
//                       </div>
//                       <span className="rounded-full border px-2.5 py-1 font-semibold" style={{ color: CPCB_COLORS[item.category] ?? '#475569', borderColor: CPCB_COLORS[item.category] ?? '#CBD5E1', backgroundColor: `${CPCB_COLORS[item.category] ?? '#64748B'}15` }}>
//                         {item.category}
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };



// import React, { useState } from 'react';
// import { AlertTriangle, Database, Info, Layers, RefreshCw } from 'lucide-react';
// import { useSelectedCity } from '../context/CityContext';
// import { useCities } from '../hooks/useOverview';
// import { useClassification } from '../hooks/useClassification';
// import type { ClassificationResponse } from '../types/classification';
// import { LoadingState } from '../components/common/LoadingState';
// import { formatDate, formatTime } from '../lib/formatters';

// const CPCB_COLORS: Record<string, string> = {
//   Good: '#10B981',
//   Satisfactory: '#84CC16',
//   Moderate: '#F59E0B',
//   Poor: '#F97316',
//   'Very Poor': '#EF4444',
//   Severe: '#881337',
// };

// export const AirQualityClassificationPage: React.FC = () => {
//   const { selectedCity, setSelectedCity } = useSelectedCity();
//   const { data: cities, isLoading: citiesLoading, error: citiesError } = useCities();
//   const classificationMutation = useClassification();
//   const [result, setResult] = useState<ClassificationResponse | null>(null);

//   const classifySelectedCity = (event: React.FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     setResult(null);
//     classificationMutation.mutate(
//       { city: selectedCity },
//       { onSuccess: (data) => setResult(data) },
//     );
//   };

//   const handleCityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
//     setSelectedCity(event.target.value);
//     setResult(null);
//     classificationMutation.reset();
//   };

//   const sortedDistribution = result
//     ? [...result.categoryDistribution].sort((a, b) => b.count - a.count)
//     : [];

//   return (
//     <div className="space-y-6">
//       <div>
//         <div className="flex flex-wrap items-center gap-2">
//           <h1 className="text-2xl font-black tracking-tight text-slate-900">
//             Air Quality Classification
//           </h1>
//           <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
//             Random Forest · CPCB
//           </span>
//         </div>
//         <p className="mt-1 text-xs text-slate-500">
//           Classify the latest stored city observation using pollutant, weather, location, calendar and historical features.
//         </p>
//       </div>

//       <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900">
//         <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
//         <p>
//           This page uses the trained CPCB bucket classifier. The numerical AQI shown in the result is the stored observation for context and is not passed into the classifier. Historical records may not represent current live conditions.
//         </p>
//       </div>

//       <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
//         <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs lg:col-span-5">
//           <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
//             <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
//               <Layers className="h-4 w-4 text-teal-700" />
//               Classification Input
//             </h2>
//             <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
//               Database-backed
//             </span>
//           </div>

//           <form onSubmit={classifySelectedCity} className="space-y-4">
//             <div>
//               <label htmlFor="classification-city" className="mb-1 block text-xs font-semibold text-slate-700">
//                 City
//               </label>
//               <select
//                 id="classification-city"
//                 value={selectedCity}
//                 onChange={handleCityChange}
//                 disabled={citiesLoading || !cities?.length || classificationMutation.isPending}
//                 className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 disabled:cursor-not-allowed disabled:bg-slate-100"
//               >
//                 {cities?.map((city) => (
//                   <option key={city.id || city.name} value={city.name}>{city.name}</option>
//                 ))}
//               </select>
//               {citiesLoading && <p className="mt-1 text-[11px] text-slate-500">Loading cities from the API…</p>}
//               {citiesError && <p className="mt-1 text-[11px] text-red-600">Could not load cities. Check the backend connection.</p>}
//               {!citiesLoading && !citiesError && !cities?.length && (
//                 <p className="mt-1 text-[11px] text-amber-700">The API did not return any cities.</p>
//               )}
//             </div>

//             <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
//               <div className="flex items-center gap-2 font-semibold text-slate-800">
//                 <Database className="h-4 w-4 text-teal-700" />
//                 Model feature source
//               </div>
//               <p className="mt-1">
//                 The backend loads the latest stored pollutant and weather record plus the previous AQI observations for the selected city. Missing values are handled by the trained preprocessing pipeline.
//               </p>
//             </div>

//             <button
//               type="submit"
//               disabled={classificationMutation.isPending || citiesLoading || !selectedCity || !!citiesError || !cities?.length}
//               className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
//             >
//               {classificationMutation.isPending ? (
//                 <>
//                   <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
//                   Classifying stored observation…
//                 </>
//               ) : (
//                 <>
//                   <Layers className="h-4 w-4" />
//                   Classify latest observation
//                 </>
//               )}
//             </button>
//           </form>

//           {classificationMutation.error && (
//             <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
//               <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
//               <div>
//                 <p className="font-bold">Classification failed</p>
//                 <p className="mt-0.5 break-words">{classificationMutation.error.message}</p>
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="space-y-6 lg:col-span-7">
//           {classificationMutation.isPending && (
//             <LoadingState message="Running the trained CPCB classification model…" />
//           )}

//           {!result && !classificationMutation.isPending && !classificationMutation.error && (
//             <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
//               <Layers className="h-9 w-9 text-slate-300" />
//               <h3 className="mt-3 text-sm font-bold text-slate-800">Ready to classify</h3>
//               <p className="mt-1 max-w-sm text-xs text-slate-500">
//                 Select a city and run classification to load its latest stored observation into the trained model.
//               </p>
//             </div>
//           )}

//           {result && !classificationMutation.isPending && (
//             <>
//               <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs" style={{ borderLeftWidth: 6, borderLeftColor: result.color }}>
//                 <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
//                   <div>
//                     <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Predicted CPCB category</p>
//                     <h2 className="mt-1 text-2xl font-black" style={{ color: result.color }}>{result.category}</h2>
//                     <p className="mt-1 text-xs text-slate-500">{result.city} · Observation date {formatDate(result.observationDate)}</p>
//                   </div>
//                   <div className="rounded-lg bg-slate-50 px-4 py-3 text-center">
//                     <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Stored AQI · context</p>
//                     <p className="mt-1 font-mono text-3xl font-black text-slate-900">{Math.round(result.aqi)}</p>
//                   </div>
//                 </div>

//                 <div className="mt-4 space-y-3 text-xs">
//                   <div>
//                     <h3 className="font-bold text-slate-900">Health statement</h3>
//                     <p className="mt-1 text-slate-600">{result.healthStatement}</p>
//                   </div>
//                   <div>
//                     <h3 className="font-bold text-slate-900">Cautionary guidance</h3>
//                     <p className="mt-1 text-slate-600">{result.cautionaryStatement}</p>
//                   </div>
//                   <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 leading-relaxed text-slate-600">{result.explanation}</p>
//                 </div>

//                 <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
//                   <span>Model: <strong className="font-mono text-slate-700">{result.metadata.model_name ?? 'Unknown'}</strong></span>
//                   <span>Source: {result.metadata.data_source} · Demo: {result.metadata.is_demo ? 'Yes' : 'No'}</span>
//                   <span>Run at {formatTime(result.metadata.timestamp)}</span>
//                 </div>
//               </div>

//               {result.probabilities && result.probabilities.length > 0 && (
//                 <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//                   <h3 className="text-sm font-bold text-slate-900">Random Forest class scores</h3>
//                   <p className="mb-4 mt-1 text-xs text-slate-500">Vote-based scores from the model; these are not calibrated health-risk probabilities.</p>
//                   <div className="space-y-3">
//                     {result.probabilities.map((item) => (
//                       <div key={item.category}>
//                         <div className="mb-1 flex items-center justify-between gap-2 text-xs">
//                           <span className="font-medium text-slate-700">{item.category}</span>
//                           <span className="font-mono text-slate-500">{(item.probability * 100).toFixed(1)}%</span>
//                         </div>
//                         <div className="h-2 overflow-hidden rounded-full bg-slate-100">
//                           <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, item.probability * 100))}%`, backgroundColor: CPCB_COLORS[item.category] ?? '#64748B' }} />
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//                 <h3 className="text-sm font-bold text-slate-900">Category distribution in latest stored observations</h3>
//                 <p className="mb-4 mt-1 text-xs text-slate-500">Frequency across the latest {result.history.length > 0 ? Math.min(14, result.categoryDistribution.reduce((sum, item) => sum + item.count, 0)) : 0} observations for {result.city}; this is historical data, not model confidence.</p>
//                 <div className="space-y-3">
//                   {sortedDistribution.map((item) => (
//                     <div key={item.category}>
//                       <div className="mb-1 flex items-center justify-between gap-2 text-xs">
//                         <span className="flex items-center gap-2 font-medium text-slate-700">
//                           <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
//                           {item.category}
//                         </span>
//                         <span className="font-mono text-slate-500">{item.count} · {item.percentage}%</span>
//                       </div>
//                       <div className="h-2 overflow-hidden rounded-full bg-slate-100">
//                         <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
//                 <div className="mb-3 flex items-center justify-between gap-2">
//                   <h3 className="text-sm font-bold text-slate-900">Recent historical observations</h3>
//                   <button type="button" onClick={() => { setResult(null); classificationMutation.reset(); }} className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
//                     <RefreshCw className="h-3.5 w-3.5" /> Clear result
//                   </button>
//                 </div>
//                 <div className="space-y-2">
//                   {result.history.map((item) => (
//                     <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
//                       <div>
//                         <span className="font-semibold text-slate-800">{item.city}</span>
//                         <span className="ml-2 font-mono text-slate-600">AQI {Math.round(item.aqi)}</span>
//                         <p className="mt-0.5 text-[11px] text-slate-500">{formatDate(item.timestamp)}</p>
//                       </div>
//                       <span className="rounded-full border px-2.5 py-1 font-semibold" style={{ color: CPCB_COLORS[item.category] ?? '#475569', borderColor: CPCB_COLORS[item.category] ?? '#CBD5E1', backgroundColor: `${CPCB_COLORS[item.category] ?? '#64748B'}15` }}>
//                         {item.category}
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };




// // import React, { useState } from 'react';
// // import { useForm } from 'react-hook-form';
// // import { zodResolver } from '@hookform/resolvers/zod';
// // import * as z from 'zod';
// // import {
// //   Layers,
// //   Sparkles,
// //   Info,
// //   CheckCircle2,
// //   AlertTriangle,
// //   History,
// //   Shield,
// //   BarChart,
// //   ArrowRight,
// // } from 'lucide-react';
// // import { useSelectedCity } from '../context/CityContext';
// // import { useCities } from '../hooks/useOverview';
// // import { useClassification } from '../hooks/useClassification';
// // import { ClassificationResponse } from '../types/classification';
// // import { US_EPA_CATEGORIES, CPCB_CATEGORIES, getCategoryDefinition } from '../lib/aqi';
// // import { CategoryBadge } from '../components/common/CategoryBadge';
// // import { CategoryPieChart } from '../components/charts/CategoryPieChart';
// // import { DemoBadge } from '../components/common/DemoBadge';
// // import { LoadingState } from '../components/common/LoadingState';
// // import { formatTime } from '../lib/formatters';

// // const classificationSchema = z.object({
// //   aqi: z.number().min(0, 'AQI must be >= 0').max(1000, 'AQI must be <= 1000'),
// //   city: z.string().optional(),
// //   scheme: z.enum(['US_EPA', 'INDIA_CPCB']),
// // });

// // type FormValues = z.infer<typeof classificationSchema>;

// // export const AirQualityClassificationPage: React.FC = () => {
// //   const { selectedCity } = useSelectedCity();
// //   const { data: cities } = useCities();
// //   const classificationMutation = useClassification();
// //   const [result, setResult] = useState<ClassificationResponse | null>(null);

// //   const {
// //     register,
// //     handleSubmit,
// //     watch,
// //     setValue,
// //     formState: { errors },
// //   } = useForm<FormValues>({
// //     resolver: zodResolver(classificationSchema),
// //     defaultValues: {
// //       aqi: 142,
// //       city: selectedCity,
// //       scheme: 'US_EPA',
// //     },
// //   });

// //   const selectedScheme = watch('scheme');

// //   // Initial classification run
// //   React.useEffect(() => {
// //     classificationMutation.mutate(
// //       { aqi: 142, city: selectedCity, scheme: 'US_EPA' },
// //       { onSuccess: (data) => setResult(data) }
// //     );
// //   }, [selectedCity]);

// //   const onSubmit = (values: FormValues) => {
// //     classificationMutation.mutate(
// //       { aqi: values.aqi, city: values.city || selectedCity, scheme: values.scheme },
// //       { onSuccess: (data) => setResult(data) }
// //     );
// //   };

// //   return (
// //     <div className="space-y-6">
// //       {/* Page Title */}
// //       <div>
// //         <div className="flex items-center gap-2">
// //           <h1 className="text-2xl font-black text-slate-900 tracking-tight">
// //             Air Quality Regulatory Classification
// //           </h1>
// //           <DemoBadge variant="subtle" />
// //         </div>
// //         <p className="text-xs text-slate-500 mt-1">
// //           Stratify numerical atmospheric particulate observations into standardized regulatory health severity tiers
// //         </p>
// //       </div>

// //       {/* Standards Disclaimer Banner */}
// //       <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3 text-xs text-teal-900">
// //         <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
// //         <div>
// //           <span className="font-bold">Standard Differentiation Note:</span> This platform defaults to the
// //           six-category <strong className="underline">US EPA AQI scheme</strong> (Good, Moderate, Unhealthy for Sensitive Groups, Unhealthy, Very Unhealthy, Hazardous).
// //           The Indian CPCB NAQI standard uses distinct buckets (Good, Satisfactory, Moderate, Poor, Very Poor, Severe) with differing numerical thresholds.
// //         </div>
// //       </div>

// //       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
// //         {/* Left Form: Input */}
// //         <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
// //           <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
// //             <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
// //               <Layers className="w-4 h-4 text-teal-700" />
// //               <span>Classification Inputs</span>
// //             </h3>
// //             <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">
// //               Deterministic Classifier
// //             </span>
// //           </div>

// //           <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
// //             {/* Regulatory Standard Selection */}
// //             <div>
// //               <label className="block text-xs font-semibold text-slate-700 mb-1">
// //                 Classification Regulatory Standard
// //               </label>
// //               <div className="grid grid-cols-2 gap-2">
// //                 <label
// //                   className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
// //                     selectedScheme === 'US_EPA'
// //                       ? 'bg-teal-50 border-teal-600 text-teal-800'
// //                       : 'border-slate-200 text-slate-600 hover:bg-slate-50'
// //                   }`}
// //                 >
// //                   <input
// //                     type="radio"
// //                     value="US_EPA"
// //                     {...register('scheme')}
// //                     className="sr-only"
// //                   />
// //                   <div className="font-bold">US EPA Standard</div>
// //                   <div className="text-[10px] text-slate-500 font-normal mt-0.5">
// //                     6 Regulatory Tiers (0–500)
// //                   </div>
// //                 </label>

// //                 <label
// //                   className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
// //                     selectedScheme === 'INDIA_CPCB'
// //                       ? 'bg-teal-50 border-teal-600 text-teal-800'
// //                       : 'border-slate-200 text-slate-600 hover:bg-slate-50'
// //                   }`}
// //                 >
// //                   <input
// //                     type="radio"
// //                     value="INDIA_CPCB"
// //                     {...register('scheme')}
// //                     className="sr-only"
// //                   />
// //                   <div className="font-bold">Indian CPCB NAQI</div>
// //                   <div className="text-[10px] text-slate-500 font-normal mt-0.5">
// //                     6 National Buckets (0–500)
// //                   </div>
// //                 </label>
// //               </div>
// //             </div>

// //             {/* Numerical AQI Input */}
// //             <div>
// //               <label className="block text-xs font-semibold text-slate-700 mb-1">
// //                 Numerical AQI Value
// //               </label>
// //               <div className="relative">
// //                 <input
// //                   type="number"
// //                   step="1"
// //                   {...register('aqi', { valueAsNumber: true })}
// //                   className="w-full text-lg font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 pl-3 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 shadow-2xs"
// //                   placeholder="e.g. 142"
// //                 />
// //                 <span className="absolute right-3 top-3 text-xs font-bold text-slate-400 font-mono">
// //                   INDEX
// //                 </span>
// //               </div>
// //               {errors.aqi && <p className="text-[11px] text-red-500 mt-1">{errors.aqi.message}</p>}

// //               {/* Quick sample chips */}
// //               <div className="flex items-center gap-1.5 mt-2 flex-wrap">
// //                 <span className="text-[10px] text-slate-400 font-medium">Quick presets:</span>
// //                 {[35, 75, 125, 175, 245, 380].map((sample) => (
// //                   <button
// //                     key={sample}
// //                     type="button"
// //                     onClick={() => setValue('aqi', sample)}
// //                     className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
// //                   >
// //                     {sample}
// //                   </button>
// //                 ))}
// //               </div>
// //             </div>

// //             {/* Classify Button */}
// //             <button
// //               type="submit"
// //               disabled={classificationMutation.isPending}
// //               className="w-full py-2.5 px-4 bg-teal-700 text-white font-bold text-xs rounded-lg hover:bg-teal-800 transition-colors shadow-xs flex items-center justify-center gap-2"
// //             >
// //               {classificationMutation.isPending ? (
// //                 <span>Mapping Regulatory Tiers...</span>
// //               ) : (
// //                 <>
// //                   <Layers className="w-4 h-4" />
// //                   <span>Classify Severity Tier</span>
// //                 </>
// //               )}
// //             </button>
// //           </form>

// //           {/* Standards Breakpoint Matrix Table */}
// //           <div className="mt-6 pt-5 border-t border-slate-100">
// //             <h4 className="text-xs font-bold text-slate-800 mb-2">
// //               {selectedScheme === 'US_EPA' ? 'US EPA Category Breakpoints' : 'India CPCB NAQI Breakpoints'}
// //             </h4>
// //             <div className="space-y-1.5">
// //               {(selectedScheme === 'US_EPA' ? US_EPA_CATEGORIES : CPCB_CATEGORIES).map((c) => (
// //                 <div
// //                   key={c.category}
// //                   className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-50"
// //                 >
// //                   <div className="flex items-center gap-2">
// //                     <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
// //                     <span className="font-medium text-slate-800">{c.category}</span>
// //                   </div>
// //                   <span className="font-mono text-slate-500 text-[11px]">
// //                     {c.min} – {c.max}
// //                   </span>
// //                 </div>
// //               ))}
// //             </div>
// //           </div>
// //         </div>

// //         {/* Right Column: Classification Result Display */}
// //         <div className="lg:col-span-7 space-y-6">
// //           {classificationMutation.isPending && (
// //             <LoadingState message="Evaluating regulatory category thresholds..." />
// //           )}

// //           {result && !classificationMutation.isPending && (
// //             <>
// //               {/* Primary Result Banner Card */}
// //               <div
// //                 className="p-6 rounded-xl border shadow-xs bg-white"
// //                 style={{ borderLeftWidth: '6px', borderLeftColor: result.color }}
// //               >
// //                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
// //                   <div>
// //                     <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
// //                       Assigned Regulatory Classification
// //                     </span>
// //                     <h2 className="text-2xl font-black text-slate-900 mt-0.5" style={{ color: result.color }}>
// //                       {result.category}
// //                     </h2>
// //                   </div>

// //                   <div className="flex items-center gap-2">
// //                     <span className="text-3xl font-black font-mono text-slate-900">
// //                       {result.aqi}
// //                     </span>
// //                     <span className="text-xs font-bold text-slate-400 font-mono">AQI</span>
// //                   </div>
// //                 </div>

// //                 <div className="mt-4 space-y-3 text-xs">
// //                   <div>
// //                     <h4 className="font-bold text-slate-900">Category Health Statement:</h4>
// //                     <p className="text-slate-600 mt-0.5">{result.healthStatement}</p>
// //                   </div>

// //                   <div>
// //                     <h4 className="font-bold text-slate-900">Cautionary Guidance:</h4>
// //                     <p className="text-slate-600 mt-0.5">{result.cautionaryStatement}</p>
// //                   </div>

// //                   <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
// //                     <strong className="text-slate-900">Classification Method: </strong>
// //                     {result.explanation}
// //                   </div>
// //                 </div>

// //                 {/* Model Confidence Notice */}
// //                 <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
// //                   <span>Engine: Deterministic Centralized Threshold Engine</span>
// //                   <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
// //                     ML Probabilities Un-Fabricated
// //                   </span>
// //                 </div>
// //               </div>

// //               {/* Category Distribution Chart */}
// //               <CategoryPieChart
// //                 data={result.categoryDistribution}
// //                 title="Historical Classification Frequency Distribution"
// //               />

// //               {/* Classification History Log */}
// //               {result.history && (
// //                 <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
// //                   <div className="flex items-center justify-between mb-3">
// //                     <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
// //                       <History className="w-4 h-4 text-teal-700" />
// //                       <span>Recent Classification Audit Trail</span>
// //                     </h3>
// //                     <span className="text-[10px] text-slate-400 font-mono">Session Log</span>
// //                   </div>

// //                   <div className="space-y-2">
// //                     {result.history.map((h) => (
// //                       <div
// //                         key={h.id}
// //                         className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
// //                       >
// //                         <div className="flex items-center gap-3">
// //                           <span className="font-bold text-slate-800">{h.city}</span>
// //                           <span className="font-mono font-bold text-slate-700">AQI {h.aqi}</span>
// //                         </div>
// //                         <div className="flex items-center gap-3">
// //                           <CategoryBadge category={h.category} size="sm" />
// //                           <span className="text-[10px] text-slate-400 font-mono">{formatTime(h.timestamp)}</span>
// //                         </div>
// //                       </div>
// //                     ))}
// //                   </div>
// //                 </div>
// //               )}
// //             </>
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };
