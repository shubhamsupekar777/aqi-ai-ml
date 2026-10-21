// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import {
//   Activity,
//   AlertCircle,
//   CheckCircle2,
//   Database,
//   RefreshCw,
//   Search,
//   Waves,
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
// // import { fetchLiveObservations, refreshLiveObservations } from '../services/liveAqiService';
// // import { LiveObservation, LiveObservationListResponse, LiveRefreshResponse } from '../types/liveAqi';
// import {
//   fetchLiveObservations,
//   refreshLiveObservations,
// } from '../services/liveAqiService';

// import type {
//   LiveObservation,
//   LiveObservationListResponse,
//   LiveRefreshResponse,
// } from '../types/liveAqi';

// const DEFAULT_START = '2024-11-01';
// const DEFAULT_END = '2024-11-03';

// function displayTimestamp(value: string | null | undefined): string {
//   if (!value) return '—';
//   // The XKDR metadata describes collected_at as a naive Indian Standard Time timestamp.
//   return `${value.replace('T', ' ')} IST`;
// }

// function displayValue(value: number | null | undefined): string {
//   if (value === null || value === undefined || !Number.isFinite(value)) return '—';
//   return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
// }

// function observationValue(row: LiveObservation): number | null {
//   // Daily aggregate responses may return mean rather than value.
//   const value = row.value ?? row.avg_value;
//   return typeof value === 'number' && Number.isFinite(value) ? value : null;
// }

// function getErrorMessage(error: unknown): string {
//   return error instanceof Error ? error.message : 'An unexpected request error occurred.';
// }

// export const LiveObservationsPage: React.FC = () => {
//   const [city, setCity] = useState('Delhi');
//   const [pollutant, setPollutant] = useState('PM2.5');
//   const [start, setStart] = useState(DEFAULT_START);
//   const [end, setEnd] = useState(DEFAULT_END);
//   const [aggregation, setAggregation] = useState<'raw' | 'hourly' | 'daily'>('raw');
//   const [limit, setLimit] = useState(10);

//   const [data, setData] = useState<LiveObservationListResponse | null>(null);
//   const [refreshResult, setRefreshResult] = useState<LiveRefreshResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState('');

//   const loadSavedObservations = useCallback(async () => {
//     setLoading(true);
//     setError('');
//     try {
//       const response = await fetchLiveObservations({
//         city: city.trim() || undefined,
//         pollutantId: pollutant.trim() || undefined,
//         limit: 100,
//         offset: 0,
//       });
//       setData(response);
//     } catch (requestError) {
//       setError(getErrorMessage(requestError));
//     } finally {
//       setLoading(false);
//     }
//   }, [city, pollutant]);

//   useEffect(() => {
//     void loadSavedObservations();
//   }, [loadSavedObservations]);

//   const chartData = useMemo(() => {
//     const records = [...(data?.records ?? [])];
//     return records
//       .filter((record) => observationValue(record) !== null)
//       .sort((a, b) => {
//         const aTime = a.observed_at ?? a.last_update;
//         const bTime = b.observed_at ?? b.last_update;
//         return aTime.localeCompare(bTime);
//       })
//       .map((record) => {
//         const timestamp = record.observed_at ?? record.last_update;
//         return {
//           timestamp,
//           label: timestamp.includes('T') ? timestamp.slice(5, 16).replace('T', ' ') : timestamp,
//           value: observationValue(record),
//           unit: record.unit ?? '',
//           station: record.station,
//         };
//       });
//   }, [data]);

//   const latestObservation = useMemo(() => {
//     return [...(data?.records ?? [])].sort((a, b) =>
//       (b.observed_at ?? b.last_update).localeCompare(a.observed_at ?? a.last_update),
//     )[0];
//   }, [data]);

//   const handleRefresh = async (event: React.FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     setRefreshing(true);
//     setError('');
//     setRefreshResult(null);

//     try {
//       const result = await refreshLiveObservations({
//         city: city.trim(),
//         parameter: pollutant.trim(),
//         start,
//         end,
//         agg: aggregation,
//         limit,
//       });
//       setRefreshResult(result);
//       const saved = await fetchLiveObservations({
//         city: city.trim() || undefined,
//         pollutantId: pollutant.trim() || undefined,
//         limit: 100,
//         offset: 0,
//       });
//       setData(saved);
//     } catch (requestError) {
//       setError(getErrorMessage(requestError));
//     } finally {
//       setRefreshing(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
//         <div>
//           <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-800">
//             <Activity className="h-3.5 w-3.5" /> XKDR measurement archive
//           </div>
//           <h1 className="text-2xl font-black tracking-tight text-slate-900">Live & Archived Pollutant Observations</h1>
//           <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
//             Browse measurements saved from the XKDR Forum India Air Quality Database. Each value is a pollutant concentration, not a consolidated AQI score.
//           </p>
//         </div>
//         <button
//           type="button"
//           onClick={() => void loadSavedObservations()}
//           disabled={loading || refreshing}
//           className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
//         >
//           <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
//           Reload saved records
//         </button>
//       </header>

//       <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
//         <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
//         <div>
//           <p className="font-bold">Data freshness notice</p>
//           <p>
//             Your metadata check reported dataset coverage through March 2026. Historical queries can return older observations; the fetch time is not the observation time. Always check the collected timestamp before describing readings as current conditions.
//           </p>
//         </div>
//       </div>

//       <form onSubmit={handleRefresh} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
//         <div className="flex items-center gap-2">
//           <Search className="h-4 w-4 text-teal-700" />
//           <h2 className="text-sm font-bold text-slate-900">Query source and refresh saved measurements</h2>
//         </div>
//         <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
//           <label className="space-y-1 text-xs font-semibold text-slate-600">
//             City
//             <input value={city} onChange={(e) => setCity(e.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" placeholder="Delhi" />
//           </label>
//           <label className="space-y-1 text-xs font-semibold text-slate-600">
//             Pollutant
//             <select value={pollutant} onChange={(e) => setPollutant(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
//               {['PM2.5', 'PM10', 'NO2', 'NO', 'NOx', 'NH3', 'CO', 'SO2', 'O3'].map((item) => <option key={item} value={item}>{item}</option>)}
//             </select>
//           </label>
//           <label className="space-y-1 text-xs font-semibold text-slate-600">
//             Start date
//             <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
//           </label>
//           <label className="space-y-1 text-xs font-semibold text-slate-600">
//             End date
//             <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
//           </label>
//           <label className="space-y-1 text-xs font-semibold text-slate-600">
//             Aggregation
//             <select value={aggregation} onChange={(e) => setAggregation(e.target.value as 'raw' | 'hourly' | 'daily')} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
//               <option value="raw">Raw hourly</option>
//               <option value="hourly">Hourly aggregate</option>
//               <option value="daily">Daily aggregate</option>
//             </select>
//           </label>
//           <label className="space-y-1 text-xs font-semibold text-slate-600">
//             Max source rows (10)
//             <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
//               {[5, 10].map((item) => <option key={item} value={item}>{item} rows</option>)}
//             </select>
//           </label>
//         </div>
//         <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
//           <p className="text-[11px] leading-5 text-slate-500">Default dates are the historical range that you successfully tested. Set a range covered by the published dataset.</p>
//           <button type="submit" disabled={refreshing || loading || !city.trim() || !pollutant.trim() || start > end} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
//             <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
//             {refreshing ? 'Fetching measurements…' : 'Fetch & save measurements'}
//           </button>
//         </div>
//       </form>

//       {error && (
//         <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-800">
//           <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
//           <p><span className="font-bold">Request failed:</span> {error}</p>
//         </div>
//       )}

//       {refreshResult && (
//         <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-950">
//           <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
//           <div className="min-w-0 flex-1">
//             <p className="font-bold">Source refresh completed</p>
//             <p>{refreshResult.message}</p>
//             <p className="mt-1 text-emerald-800">Received {refreshResult.received}; inserted {refreshResult.inserted}; updated {refreshResult.updated}; skipped {refreshResult.skipped}{refreshResult.truncated ? '; source result was truncated by its row limit.' : '.'}</p>
//             {refreshResult.dataset_exported_at && <p className="mt-1 text-emerald-800">Dataset export published (UTC): {refreshResult.dataset_exported_at.replace('T', ' ')}</p>}
//           </div>
//         </div>
//       )}

//       <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
//         <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
//           <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Database className="h-4 w-4 text-teal-700" /> Saved observations</div>
//           <p className="mt-3 text-2xl font-black text-slate-900">{loading ? '…' : (data?.total ?? 0).toLocaleString('en-IN')}</p>
//           <p className="mt-1 text-[11px] text-slate-500">Matching saved rows returned by the backend</p>
//         </div>
//         <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
//           <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Waves className="h-4 w-4 text-teal-700" /> Selected pollutant</div>
//           <p className="mt-3 text-2xl font-black text-slate-900">{pollutant}</p>
//           <p className="mt-1 text-[11px] text-slate-500">Concentration unit is supplied with each measurement</p>
//         </div>
//         <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
//           <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Activity className="h-4 w-4 text-teal-700" /> Latest observation time</div>
//           <p className="mt-3 break-words text-sm font-black text-slate-900">{latestObservation ? displayTimestamp(latestObservation.observed_at ?? latestObservation.last_update) : '—'}</p>
//           <p className="mt-1 text-[11px] text-slate-500">Timestamp from the measurement, not fetch time</p>
//         </div>
//         <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
//           <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Database className="h-4 w-4 text-teal-700" /> Data source</div>
//           <p className="mt-3 text-sm font-black text-slate-900">XKDR / CPCB archive</p>
//           <p className="mt-1 text-[11px] text-slate-500">Historical coverage; not guaranteed live</p>
//         </div>
//       </div>

//       <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
//         <div className="mb-4">
//           <h2 className="text-sm font-bold text-slate-900">Pollutant concentration over time</h2>
//           <p className="mt-1 text-xs text-slate-500">Chart uses saved records and their observation timestamps. Values remain in the source unit and are not AQI.</p>
//         </div>
//         {loading ? (
//           <div className="flex h-64 items-center justify-center text-xs text-slate-500">Loading saved measurements…</div>
//         ) : chartData.length === 0 ? (
//           <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 text-center">
//             <Activity className="h-6 w-6 text-slate-300" />
//             <p className="text-sm font-semibold text-slate-700">No chartable measurements found</p>
//             <p className="max-w-md text-xs text-slate-500">Fetch a known historical date range, or choose a city and pollutant with saved records.</p>
//           </div>
//         ) : (
//           <div className="h-72 w-full">
//             <ResponsiveContainer width="100%" height="100%">
//               <LineChart data={chartData} margin={{ top: 8, right: 12, left: 2, bottom: 10 }}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
//                 <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} angle={-18} textAnchor="end" height={48} />
//                 <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={60} />
//                 <Tooltip formatter={(value) => [`${displayValue(typeof value === 'number' ? value : Number(value))} ${chartData[0]?.unit ?? ''}`, pollutant]} labelFormatter={(_, payload) => payload?.[0]?.payload?.timestamp ?? ''} />
//                 <Line type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3, fill: '#0f766e' }} activeDot={{ r: 5 }} connectNulls={false} />
//               </LineChart>
//             </ResponsiveContainer>
//           </div>
//         )}
//       </section>

//       <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
//         <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
//           <div>
//             <h2 className="text-sm font-bold text-slate-900">Saved observation records</h2>
//             <p className="mt-1 text-[11px] text-slate-500">Filtered by city and pollutant. The backend endpoint returns up to 100 rows per request.</p>
//           </div>
//           <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{data?.total ?? 0} record(s)</span>
//         </div>
//         {loading ? (
//           <div className="p-8 text-center text-xs text-slate-500">Loading records…</div>
//         ) : !data?.records.length ? (
//           <div className="p-8 text-center text-xs text-slate-500">No matching saved observations. Fetch a historical range above to populate this table.</div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full min-w-[940px] border-collapse text-left text-xs">
//               <thead>
//                 <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
//                   <th className="px-4 py-3 font-semibold">Observed at (IST)</th>
//                   <th className="px-4 py-3 font-semibold">City / State</th>
//                   <th className="px-4 py-3 font-semibold">Station</th>
//                   <th className="px-4 py-3 font-semibold">Parameter</th>
//                   <th className="px-4 py-3 text-right font-semibold">Value</th>
//                   <th className="px-4 py-3 font-semibold">Unit</th>
//                   <th className="px-4 py-3 font-semibold">Aggregation</th>
//                   <th className="px-4 py-3 font-semibold">Fetched at</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {data.records.map((record) => (
//                   <tr key={record.id} className="transition hover:bg-slate-50">
//                     <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700">{displayTimestamp(record.observed_at ?? record.last_update)}</td>
//                     <td className="px-4 py-3"><p className="font-semibold text-slate-900">{record.city}</p><p className="mt-0.5 text-[11px] text-slate-500">{record.state || '—'}</p></td>
//                     <td className="max-w-[260px] px-4 py-3 text-slate-700"><p className="truncate" title={record.station}>{record.station}</p><p className="mt-0.5 text-[11px] text-slate-500">{record.station_id || 'No station ID'}</p></td>
//                     <td className="px-4 py-3"><span className="rounded-md border border-teal-100 bg-teal-50 px-2 py-1 font-semibold text-teal-800">{record.pollutant_id}</span></td>
//                     <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{displayValue(observationValue(record))}</td>
//                     <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.unit || '—'}</td>
//                     <td className="px-4 py-3 text-slate-600">{record.aggregation || 'raw'}</td>
//                     <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-slate-500">{displayTimestamp(record.fetched_at)}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </section>

//       <p className="text-[11px] leading-5 text-slate-500">
//         Measurement timestamps are provided as naive IST timestamps by the source. Fetch timestamps describe when this application stored or refreshed a row; they do not mean the pollutant was measured at that time.
//       </p>
//     </div>
//   );
// };

// export default LiveObservationsPage;
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Database,
  MapPin,
  RefreshCw,
  Search,
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
import { fetchLiveObservations, refreshLiveObservations } from '../services/liveAqiService';
import type {
  LiveObservation,
  LiveObservationListResponse,
  LiveRefreshResponse,
} from '../types/liveAqi';

function displayTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  // OpenAQ provides a local timestamp and/or UTC timestamp. When the API returns
  // an ISO string without an offset, this application treats the local value as IST.
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const normalized = hasOffset ? value : `${value.replace(' ', 'T')}+05:30`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return value.replace('T', ' ');
  return parsed.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' IST';
}

function displayFetchTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return value.replace('T', ' ');
  return parsed.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' IST';
}

function displayValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function observationValue(row: LiveObservation): number | null {
  const value = row.value ?? row.avg_value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected request error occurred.';
}

export const LiveObservationsPage: React.FC = () => {
  const [city, setCity] = useState('Pune');
  const [state, setState] = useState('Maharashtra');
  const [pollutant, setPollutant] = useState('PM2.5');
  const [limit, setLimit] = useState(10);
  const [radiusMeters, setRadiusMeters] = useState(25000);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const [data, setData] = useState<LiveObservationListResponse | null>(null);
  const [refreshResult, setRefreshResult] = useState<LiveRefreshResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadSavedObservations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchLiveObservations({
        city: city.trim() || undefined,
        pollutantId: pollutant.trim() || undefined,
        limit: 100,
        offset: 0,
      });
      setData(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [city, pollutant]);

  useEffect(() => {
    void loadSavedObservations();
  }, [loadSavedObservations]);

  const chartData = useMemo(() => {
    return [...(data?.records ?? [])]
      .filter((record) => observationValue(record) !== null)
      .sort((a, b) => {
        const aTime = a.observed_at ?? a.last_update;
        const bTime = b.observed_at ?? b.last_update;
        return aTime.localeCompare(bTime);
      })
      .map((record) => {
        const timestamp = record.observed_at ?? record.last_update;
        return {
          timestamp,
          label: timestamp.includes('T') ? timestamp.slice(5, 16).replace('T', ' ') : timestamp,
          value: observationValue(record),
          unit: record.unit ?? '',
          station: record.station,
        };
      });
  }, [data]);

  const latestObservation = useMemo(() => {
    return [...(data?.records ?? [])].sort((a, b) =>
      (b.observed_at ?? b.last_update).localeCompare(a.observed_at ?? a.last_update),
    )[0];
  }, [data]);

  const handleRefresh = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRefreshing(true);
    setError('');
    setRefreshResult(null);

    const latText = latitude.trim();
    const lonText = longitude.trim();
    if (Boolean(latText) !== Boolean(lonText)) {
      setError('Enter both latitude and longitude, or leave both fields empty.');
      setRefreshing(false);
      return;
    }

    try {
      const result = await refreshLiveObservations({
        city: city.trim(),
        state: state.trim() || undefined,
        parameter: pollutant,
        limit,
        radiusMeters,
        latitude: latText ? Number(latText) : undefined,
        longitude: lonText ? Number(lonText) : undefined,
      });
      setRefreshResult(result);
      const saved = await fetchLiveObservations({
        city: city.trim() || undefined,
        pollutantId: pollutant.trim() || undefined,
        limit: 100,
        offset: 0,
      });
      setData(saved);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-800">
            <Activity className="h-3.5 w-3.5" /> OpenAQ API v3
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Live & Latest Pollutant Observations</h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            Fetches the latest available sensor-series measurements from nearby OpenAQ locations and stores them for browsing. Pollutant concentrations are not consolidated CPCB AQI values.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSavedObservations()}
          disabled={loading || refreshing}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Reload saved records
        </button>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-bold">Data freshness and meaning</p>
          <p>
            OpenAQ's Latest endpoint returns the latest value in a sensor series; it may be delayed and does not guarantee minute-by-minute updates. Check the measurement timestamp below. A pollutant concentration is not the overall Indian CPCB AQI.
          </p>
        </div>
      </div>

      <form onSubmit={handleRefresh} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-teal-700" />
          <h2 className="text-sm font-bold text-slate-900">Search nearby monitoring locations</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            City
            <input value={city} onChange={(e) => setCity(e.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" placeholder="Pune" />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            State (label)
            <input value={state} onChange={(e) => setState(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" placeholder="Maharashtra" />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Pollutant
            <select value={pollutant} onChange={(e) => setPollutant(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
              {['PM2.5', 'PM10', 'NO2', 'NO', 'NOX', 'NH3', 'CO', 'SO2', 'O3'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Maximum observations
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
              {[5, 10, 20, 50, 100].map((item) => <option key={item} value={item}>{item} readings</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Search radius
            <select value={radiusMeters} onChange={(e) => setRadiusMeters(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={25000}>25 km (maximum)</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Latitude (optional)
            <input type="number" min="-90" max="90" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" placeholder="Auto from city" />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Longitude (optional)
            <input type="number" min="-180" max="180" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" placeholder="Auto from city" />
          </label>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-5 text-slate-500">Known city coordinates are used automatically where available. For another city, enter both latitude and longitude or add coordinates to its database record.</p>
          <button type="submit" disabled={refreshing || loading || !city.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Fetching OpenAQ readings…' : 'Fetch latest measurements'}
          </button>
        </div>
      </form>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {refreshResult && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-950">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">OpenAQ refresh completed</p>
            <p>{refreshResult.message}</p>
            <p className="mt-1 text-[11px]">Received: {refreshResult.received} · Inserted: {refreshResult.inserted} · Updated: {refreshResult.updated} · Skipped: {refreshResult.skipped} · Locations queried: {refreshResult.locations_checked}</p>
            <p className="mt-1 text-[11px]">Latest source timestamp returned: {displayTimestamp(refreshResult.latest_observation_at)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Database className="h-4 w-4 text-teal-700" /> Saved readings</div>
          <p className="mt-3 text-2xl font-black text-slate-900">{data?.total ?? 0}</p>
          <p className="mt-1 text-[11px] text-slate-500">OpenAQ records matching current filters</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Activity className="h-4 w-4 text-teal-700" /> Selected pollutant</div>
          <p className="mt-3 text-2xl font-black text-slate-900">{pollutant}</p>
          <p className="mt-1 text-[11px] text-slate-500">Units are provided by each sensor</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><MapPin className="h-4 w-4 text-teal-700" /> City</div>
          <p className="mt-3 text-2xl font-black text-slate-900">{city || '—'}</p>
          <p className="mt-1 text-[11px] text-slate-500">Search centre, not a city-wide official AQI</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Activity className="h-4 w-4 text-teal-700" /> Latest observation</div>
          <p className="mt-3 break-words text-sm font-black text-slate-900">{latestObservation ? displayTimestamp(latestObservation.last_update) : '—'}</p>
          <p className="mt-1 text-[11px] text-slate-500">Observation timestamp, not fetch time</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-slate-900">Pollutant measurement by observation time</h2>
          <p className="mt-1 text-xs text-slate-500">Chart uses stored values and their observation timestamps. Values remain in the original sensor units and are not AQI.</p>
        </div>
        {loading ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-500">Loading saved measurements…</div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 text-center">
            <Activity className="h-6 w-6 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No measurements found</p>
            <p className="max-w-md text-xs text-slate-500">Fetch latest readings for a city/pollutant with OpenAQ coverage.</p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 2, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} angle={-18} textAnchor="end" height={48} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={60} />
                <Tooltip formatter={(value) => [`${displayValue(typeof value === 'number' ? value : Number(value))} ${chartData[0]?.unit ?? ''}`, pollutant]} labelFormatter={(_, payload) => payload?.[0]?.payload?.timestamp ?? ''} />
                <Line type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3, fill: '#0f766e' }} activeDot={{ r: 5 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Saved OpenAQ measurements</h2>
            <p className="mt-1 text-[11px] text-slate-500">The backend returns observations already stored in the OpenAQ table.</p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{data?.total ?? 0} record(s)</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading records…</div>
        ) : !data?.records.length ? (
          <div className="p-8 text-center text-xs text-slate-500">No matching saved observations. Fetch a nearby OpenAQ reading first.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Observed at (IST)</th>
                  <th className="px-4 py-3 font-semibold">City / State</th>
                  <th className="px-4 py-3 font-semibold">Monitoring location / sensor</th>
                  <th className="px-4 py-3 font-semibold">Parameter</th>
                  <th className="px-4 py-3 text-right font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Unit</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Fetched at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.records.map((record) => (
                  <tr key={record.id} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700">{displayTimestamp(record.last_update)}</td>
                    <td className="px-4 py-3"><p className="font-semibold text-slate-900">{record.city}</p><p className="mt-0.5 text-[11px] text-slate-500">{record.state || '—'}</p></td>
                    <td className="max-w-[260px] px-4 py-3 text-slate-700"><p className="truncate" title={record.station}>{record.station}</p><p className="mt-0.5 text-[11px] text-slate-500">Sensor ID: {record.station_id || '—'}</p></td>
                    <td className="px-4 py-3"><span className="rounded-md border border-teal-100 bg-teal-50 px-2 py-1 font-semibold text-teal-800">{record.pollutant_id}</span></td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{displayValue(observationValue(record))}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.unit || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{record.source}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-slate-500">{displayFetchTimestamp(record.fetched_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[11px] leading-5 text-slate-500">
        The refresh time indicates when AQI AI contacted OpenAQ and stored the row; it does not mean the underlying pollutant was measured at that moment. OpenAQ records are sensor measurements, not necessarily official city-level CPCB AQI.
      </p>
    </div>
  );
};
