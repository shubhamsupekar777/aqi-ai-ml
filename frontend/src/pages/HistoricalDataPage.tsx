
import React, { useState } from 'react';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

import { useHistoricalData } from '../hooks/useHistoricalData';
import { useCities } from '../hooks/useOverview';
import { HistoricalFilterParams } from '../types/history';
import { CategoryBadge } from '../components/common/CategoryBadge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';

export const HistoricalDataPage: React.FC = () => {
  const [params, setParams] = useState<HistoricalFilterParams>({
    city: 'All Cities',
    page: 1,
    pageSize: 8,
    search: '',
  });

  // Fetch the available cities from the API.
  const {
    data: cities = [],
    isLoading: isCitiesLoading,
  } = useCities();

  // Fetch historical AQI observations using the current filters.
  const { data, isLoading, error } = useHistoricalData(params);

  const handleCityChange = (city: string) => {
    setParams((previous) => ({
      ...previous,
      city,
      page: 1,
    }));
  };

  const handleSearchChange = (search: string) => {
    setParams((previous) => ({
      ...previous,
      search,
      page: 1,
    }));
  };

  const exportToCsv = () => {
    if (!data || data.items.length === 0) return;

    const headers = [
      'City',
      'Date',
      'AQI',
      'Category',
      'OriginalBucket',
      'PM2.5',
      'PM10',
      'NO2',
      'SO2',
      'CO',
      'O3',
      'Temp',
      'Humidity',
      'DataSource',
    ];

    const escapeCsv = (value: unknown) => {
      const text = value == null ? '' : String(value);

      return /[",\n]/.test(text)
        ? `"${text.replace(/"/g, '""')}"`
        : text;
    };

    const rows = data.items.map((record) => [
      record.city,
      record.date,
      record.aqi,
      record.category,
      record.originalCategory || '',
      record.pm25,
      record.pm10,
      record.no2,
      record.so2,
      record.co,
      record.o3,
      record.temperature ?? '',
      record.humidity ?? '',
      record.dataSource ?? '',
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute(
      'download',
      `aqi_historical_export_${new Date().toISOString().split('T')[0]}.csv`,
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Historical Air Quality Records
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Historical AQI, pollutant, and available weather records stored in
            PostgreSQL. These observations are not live measurements.
          </p>
        </div>

        <button
          onClick={exportToCsv}
          disabled={!data || data.items.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4 text-slate-600" />
          <span>Export Filtered CSV</span>
        </button>
      </div>

      {/* Historical dataset information */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />

        <div>
          <span className="font-bold text-slate-900">
            Dataset information:{' '}
          </span>

          Data is loaded from the historical observation tables. The available
          dataset spans 2015–2020; check each record's date when interpreting
          the values.
        </div>
      </div>

      {/* Search and dynamic city filter */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs sm:flex-row">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

          <input
            type="text"
            placeholder="Search by city, date, or category..."
            value={params.search || ''}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-teal-600 focus:outline-none"
          />
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto">
          <label
            htmlFor="historical-city-filter"
            className="text-xs font-medium text-slate-600"
          >
            City
          </label>

          <select
            id="historical-city-filter"
            value={params.city || 'All Cities'}
            onChange={(event) => handleCityChange(event.target.value)}
            disabled={isCitiesLoading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs focus:border-teal-600 focus:outline-none"
          >
            <option value="All Cities">All Cities</option>

            {cities.map((city) => (
              <option key={city.id} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Historical records */}
      {isLoading ? (
        <LoadingState message="Loading historical records from the database..." />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          Unable to load historical records. {error.message}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No historical observations found"
          description="Try broadening your search query or selecting another city."
          actionText="Clear Filters"
          onAction={() =>
            setParams({
              city: 'All Cities',
              page: 1,
              pageSize: 8,
              search: '',
            })
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-500">
                  <th className="px-4 py-3 text-slate-700">Date</th>
                  <th className="px-4 py-3 text-slate-700">City</th>
                  <th className="px-4 py-3 text-slate-700">AQI</th>
                  <th className="px-4 py-3 text-slate-700">Category</th>
                  <th className="px-4 py-3 text-slate-700">Original Bucket</th>
                  <th className="px-4 py-3 text-slate-700">PM2.5</th>
                  <th className="px-4 py-3 text-slate-700">PM10</th>
                  <th className="px-4 py-3 text-slate-700">NO2</th>
                  <th className="px-4 py-3 text-slate-700">SO2</th>
                  <th className="px-4 py-3 text-slate-700">CO</th>
                  <th className="px-4 py-3 text-slate-700">O3</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {data.items.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-slate-700">
                      {row.date}
                    </td>

                    <td className="px-4 py-3 font-bold text-slate-900">
                      {row.city}
                    </td>

                    <td className="px-4 py-3 font-mono font-black text-slate-900">
                      {row.aqi}
                    </td>

                    <td className="px-4 py-3">
                      <CategoryBadge category={row.category} size="sm" />
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                        {row.originalCategory || 'N/A'}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-700">
                      {row.pm25 ?? '—'}
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-700">
                      {row.pm10 ?? '—'}
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-700">
                      {row.no2 ?? '—'}
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-700">
                      {row.so2 ?? '—'}
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-700">
                      {row.co ?? '—'}
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-700">
                      {row.o3 ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>
              Showing{' '}
              {data.total === 0
                ? 0
                : (data.page - 1) * data.pageSize + 1}{' '}
              to {Math.min(data.page * data.pageSize, data.total)} of{' '}
              {data.total} records
            </span>

            <div className="flex items-center gap-2">
              <button
                aria-label="Previous page"
                disabled={data.page <= 1}
                onClick={() =>
                  setParams((previous) => ({
                    ...previous,
                    page: (previous.page || 1) - 1,
                  }))
                }
                className="rounded border border-slate-200 p-1 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="font-mono font-medium">
                Page {data.page} of {data.totalPages}
              </span>

              <button
                aria-label="Next page"
                disabled={data.page >= data.totalPages}
                onClick={() =>
                  setParams((previous) => ({
                    ...previous,
                    page: (previous.page || 1) + 1,
                  }))
                }
                className="rounded border border-slate-200 p-1 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};









// import React, { useState } from 'react';
// import {
//   Database,
//   Search,
//   Filter,
//   Download,
//   ChevronLeft,
//   ChevronRight,
//   Info,
//   Calendar,
// } from 'lucide-react';
// import { useHistoricalData } from '../hooks/useHistoricalData';
// import { HistoricalFilterParams, HistoricalRecord } from '../types/history';
// import { CategoryBadge } from '../components/common/CategoryBadge';
// import { DemoBadge } from '../components/common/DemoBadge';
// import { LoadingState } from '../components/common/LoadingState';
// import { EmptyState } from '../components/common/EmptyState';
// import { formatDate } from '../lib/formatters';

// export const HistoricalDataPage: React.FC = () => {
//   const [params, setParams] = useState<HistoricalFilterParams>({
//     city: 'All Cities',
//     page: 1,
//     pageSize: 8,
//     search: '',
//   });

//   const { data, isLoading, error } = useHistoricalData(params);

//   const handleCityChange = (city: string) => {
//     setParams(prev => ({ ...prev, city, page: 1 }));
//   };

//   const handleSearchChange = (search: string) => {
//     setParams(prev => ({ ...prev, search, page: 1 }));
//   };

//   const exportToCsv = () => {
//     if (!data || !data.items.length) return;
//     const headers = ['City', 'Date', 'AQI', 'Category', 'OriginalBucket', 'PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'Temp', 'Humidity', 'DataSource'];
//     const rows = data.items.map(r => [
//       r.city,
//       r.date,
//       r.aqi,
//       r.category,
//       r.originalCategory || '',
//       r.pm25,
//       r.pm10,
//       r.no2,
//       r.so2,
//       r.co,
//       r.o3,
//       r.temperature ?? '',
//       r.humidity ?? '',
//       r.dataSource ?? ''
//     ]);

//     const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.setAttribute('download', `aqi_historical_export_${new Date().toISOString().split('T')[0]}.csv`);
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   return (
//     <div className="space-y-6">
//       {/* Title */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div>
//           <div className="flex items-center gap-2">
//             <h1 className="text-2xl font-black text-slate-900 tracking-tight">
//               Historical Air Quality Dataset Records
//             </h1>
//             <DemoBadge variant="subtle" />
//           </div>
//           <p className="text-xs text-slate-500 mt-1">
//             Ground-truth station telemetry, multi-pollutant concentrations, and meteorological observations
//           </p>
//         </div>

//         <button
//           onClick={exportToCsv}
//           disabled={!data || !data.items.length}
//           className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors disabled:opacity-50"
//         >
//           <Download className="w-4 h-4 text-slate-600" />
//           <span>Export Filtered CSV</span>
//         </button>
//       </div>

//       {/* Dataset Source Information Note */}
//       <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-700">
//         <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
//         <div>
//           <span className="font-bold text-slate-900">Historical Dataset Pipeline:</span> Schema maps to standard Indian CPCB and meteorological observation datasets (`cleaned_city_day.csv` and weather merges).
//           New CSV datasets can be ingested at any time via the backend importer script (`backend/app/data/import_historical_data.py`).
//         </div>
//       </div>

//       {/* Filters Strip */}
//       <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
//         <div className="relative w-full sm:w-72">
//           <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
//           <input
//             type="text"
//             placeholder="Search by city, date, or category..."
//             value={params.search || ''}
//             onChange={(e) => handleSearchChange(e.target.value)}
//             className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:border-teal-600 focus:outline-none"
//           />
//         </div>

//         <div className="flex items-center gap-3 w-full sm:w-auto">
//           <select
//             value={params.city || 'All Cities'}
//             onChange={(e) => handleCityChange(e.target.value)}
//             className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:border-teal-600 focus:outline-none shadow-2xs"
//           >
//             <option value="All Cities">All Cities</option>
//             <option value="Delhi">Delhi</option>
//             <option value="Mumbai">Mumbai</option>
//             <option value="Pune">Pune</option>
//             <option value="Bengaluru">Bengaluru</option>
//             <option value="Chennai">Chennai</option>
//             <option value="Hyderabad">Hyderabad</option>
//           </select>
//         </div>
//       </div>

//       {/* Data Table */}
//       {isLoading ? (
//         <LoadingState message="Retrieving historical telemetry records..." />
//       ) : !data || data.items.length === 0 ? (
//         <EmptyState
//           title="No historical observations found"
//           description="Try broadening your search query or switching the city filter."
//           actionText="Clear Filter"
//           onAction={() => setParams({ city: 'All Cities', page: 1, pageSize: 8, search: '' })}
//         />
//       ) : (
//         <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full text-left text-xs border-collapse">
//               <thead>
//                 <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
//                   <th className="py-3 px-4 text-slate-700">Date</th>
//                   <th className="py-3 px-4 text-slate-700">City</th>
//                   <th className="py-3 px-4 text-slate-700">AQI</th>
//                   <th className="py-3 px-4 text-slate-700">Category</th>
//                   <th className="py-3 px-4 text-slate-700">Original Bucket</th>
//                   <th className="py-3 px-4 text-slate-700">PM2.5</th>
//                   <th className="py-3 px-4 text-slate-700">PM10</th>
//                   <th className="py-3 px-4 text-slate-700">NO2</th>
//                   <th className="py-3 px-4 text-slate-700">SO2</th>
//                   <th className="py-3 px-4 text-slate-700">CO</th>
//                   <th className="py-3 px-4 text-slate-700">O3</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {data.items.map((row) => (
//                   <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
//                     <td className="py-3 px-4 font-mono font-medium text-slate-700">{row.date}</td>
//                     <td className="py-3 px-4 font-bold text-slate-900">{row.city}</td>
//                     <td className="py-3 px-4 font-mono font-black text-slate-900">{row.aqi}</td>
//                     <td className="py-3 px-4">
//                       <CategoryBadge category={row.category} size="sm" />
//                     </td>
//                     <td className="py-3 px-4">
//                       <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
//                         {row.originalCategory || 'N/A'}
//                       </span>
//                     </td>
//                     <td className="py-3 px-4 font-mono text-slate-700">{row.pm25}</td>
//                     <td className="py-3 px-4 font-mono text-slate-700">{row.pm10}</td>
//                     <td className="py-3 px-4 font-mono text-slate-700">{row.no2}</td>
//                     <td className="py-3 px-4 font-mono text-slate-700">{row.so2}</td>
//                     <td className="py-3 px-4 font-mono text-slate-700">{row.co}</td>
//                     <td className="py-3 px-4 font-mono text-slate-700">{row.o3}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {/* Pagination Footer */}
//           <div className="py-3 px-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
//             <span>
//               Showing {(data.page - 1) * data.pageSize + 1} to{' '}
//               {Math.min(data.page * data.pageSize, data.total)} of {data.total} records
//             </span>

//             <div className="flex items-center gap-2">
//               <button
//                 disabled={data.page <= 1}
//                 onClick={() => setParams(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
//                 className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
//               >
//                 <ChevronLeft className="w-4 h-4" />
//               </button>
//               <span className="font-mono font-medium">
//                 Page {data.page} of {data.totalPages}
//               </span>
//               <button
//                 disabled={data.page >= data.totalPages}
//                 onClick={() => setParams(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
//                 className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
//               >
//                 <ChevronRight className="w-4 h-4" />
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };
