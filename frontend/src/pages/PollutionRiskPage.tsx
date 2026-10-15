
import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  HeartPulse,
  Info,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useSelectedCity } from '../context/CityContext';
import { useRiskAssessment } from '../hooks/useRisk';
import type { RiskAssessmentResponse } from '../types/risk';
import { RiskBadge } from '../components/common/RiskBadge';
import { LoadingState } from '../components/common/LoadingState';
import { formatDate, formatTime } from '../lib/formatters';

const RISK_COLORS: Record<string, string> = {
  'Low Risk': '#10B981',
  'Moderate Risk': '#F59E0B',
  'High Risk': '#EF4444',
  'Severe Risk': '#881337',
};

export const PollutionRiskPage: React.FC = () => {
  const { selectedCity } = useSelectedCity();
  const riskMutation = useRiskAssessment();
  const [riskData, setRiskData] = useState<RiskAssessmentResponse | null>(null);
  const [customAqi, setCustomAqi] = useState<number>(100);
  const [showScenario, setShowScenario] = useState(false);

  useEffect(() => {
    setRiskData(null);
    setShowScenario(false);
    riskMutation.mutate(
      { city: selectedCity },
      {
        onSuccess: (data) => {
          setRiskData(data);
          setCustomAqi(Math.round(data.referenceAqi));
        },
      },
    );
    // The selected city is the intended refresh trigger for this mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity]);

  const assessScenario = () => {
    setShowScenario(true);
    riskMutation.mutate(
      { city: selectedCity, aqi: customAqi },
      { onSuccess: (data) => setRiskData(data) },
    );
  };

  const loadStoredObservation = () => {
    setShowScenario(false);
    riskMutation.mutate(
      { city: selectedCity },
      { onSuccess: (data) => {
        setRiskData(data);
        setCustomAqi(Math.round(data.referenceAqi));
      } },
    );
  };

  if (!riskData && riskMutation.isPending) {
    return <LoadingState message={`Assessing stored AQI exposure for ${selectedCity}…`} />;
  }

  if (!riskData) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-red-600" />
        <h2 className="text-sm font-bold text-red-900">Risk assessment unavailable</h2>
        <p className="mt-2 text-xs text-red-800">
          {riskMutation.error?.message || `No stored AQI observation could be loaded for ${selectedCity}.`}
        </p>
        <button
          type="button"
          onClick={loadStoredObservation}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  const isHypothetical = riskData.metadata.data_source === 'user_input' || showScenario;
  const observationLabel = riskData.observationDate
    ? formatDate(riskData.observationDate)
    : 'Not applicable to a hypothetical scenario';

  return (
    <div className="w-full min-w-0 space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Pollution & Health Risk Exposure Assessment
          </h1>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
            CPCB AQI · Rule Engine v1
          </span>
          {isHypothetical && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Hypothetical scenario
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Transparent AQI-based exposure tiers and general precautions, using stored observations where available.
        </p>
      </header>

      {/* <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <p>
          This page uses a documented rule engine, not a trained health-outcome ML model. Risk tiers are general ambient-air guidance; they do not diagnose personal conditions or replace official public-health advice. Historical observations may not represent current conditions.
        </p>
      </div> */}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Database className="h-4 w-4" />
              <span>{riskData.city} exposure profile</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                {riskData.ruleIdentifier}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-black text-slate-900">{riskData.warningTitle}</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600">{riskData.summary}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right">
              <span className="block text-xs font-semibold uppercase text-slate-400">
                {isHypothetical ? 'Scenario AQI' : 'Stored AQI'}
              </span>
              <span className="font-mono text-3xl font-black text-slate-900">
                {Math.round(riskData.referenceAqi)}
              </span>
              <span className="block text-xs text-slate-500">{riskData.category}</span>
            </div>
            <RiskBadge level={riskData.riskClassification} size="lg" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Observation date</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{isHypothetical ? 'Hypothetical input' : observationLabel}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Observation source</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-800">
              {isHypothetical ? 'User-entered scenario' : (riskData.observationSource || 'Database source not specified')}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Assessment run</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatDate(riskData.metadata.timestamp)} · {formatTime(riskData.metadata.timestamp)}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Explore a hypothetical AQI scenario</h3>
              <p className="mt-1 text-xs text-slate-500">Move the slider and assess a what-if value. This does not change the stored observation.</p>
            </div>
            <span className="font-mono text-lg font-bold text-teal-800">{customAqi} AQI</span>
          </div>
          <input
            aria-label="Hypothetical AQI value"
            type="range"
            min={0}
            max={500}
            step={1}
            value={customAqi}
            onChange={(event) => setCustomAqi(Number(event.target.value))}
            className="mt-4 w-full cursor-pointer accent-teal-700"
          />
          <div className="mt-1 flex flex-wrap justify-between gap-2 text-[10px] text-slate-500">
            <span>0–50 · Low</span>
            <span>51–100 · Moderate</span>
            <span>101–200 · High</span>
            <span>201+ · Severe</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={riskMutation.isPending}
              onClick={assessScenario}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Activity className="h-3.5 w-3.5" />
              Assess hypothetical AQI
            </button>
            {isHypothetical && (
              <button
                type="button"
                disabled={riskMutation.isPending}
                onClick={loadStoredObservation}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Return to stored observation
              </button>
            )}
          </div>
          {riskMutation.isError && riskData && (
            <p className="mt-3 text-xs text-red-700">The latest request failed: {riskMutation.error.message}</p>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3.5 text-xs leading-relaxed text-slate-600">
          <strong className="text-slate-800">Classification rationale: </strong>
          {riskData.explanation}
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">General precautions</h3>
          </div>
          <p className="mb-4 text-xs text-slate-500">General outdoor-exposure guidance for the assessed AQI tier.</p>
          <ul className="space-y-3">
            {riskData.generalPrecautions.map((item, index) => (
              <li key={`${item}-${index}`} className="flex items-start gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">Guidance for potentially sensitive groups</h3>
          </div>
          <p className="mb-4 text-xs text-slate-500">General guidance only; individual responses vary.</p>
          <div className="space-y-3">
            {riskData.demographicGuidelines.map((item) => (
              <div key={item.group} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">{item.group}</span>
                  <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">{item.exposureRisk}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">{item.recommendation}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-1 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">Risk distribution by city</h3>
          </div>
          <p className="mb-4 text-xs text-slate-500">Counts are calculated from each city's latest stored AQI observation, not fabricated sample totals.</p>
          {riskData.riskDistribution.length > 0 ? (
            <div className="space-y-4">
              {riskData.riskDistribution.map((item) => (
                <div key={item.level}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-700">{item.level}</span>
                    <span className="font-mono text-slate-500">{item.count} cities · {item.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Not enough stored city observations to calculate a distribution.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="mb-1 text-sm font-bold text-slate-900">City comparison</h3>
          <p className="mb-4 text-xs text-slate-500">Up to six cities, ranked by their latest stored AQI reading.</p>
          {riskData.cityRiskComparison.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {riskData.cityRiskComparison.map((item) => (
                <div key={item.city} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                  <span className="block text-xs font-bold text-slate-800">{item.city}</span>
                  <span className="my-1 block font-mono text-xl font-black text-slate-900">{Math.round(item.aqi)}</span>
                  <span className="mb-2 block text-[10px] text-slate-500">AQI</span>
                  <RiskBadge level={item.risk} size="sm" showIcon={false} />
                  <div className="mx-auto mt-2 h-1 w-full rounded-full" style={{ backgroundColor: RISK_COLORS[item.risk] || item.color }} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No city comparisons are available.</p>
          )}
        </section>
      </div>
    </div>
  );
};


// import React, { useState } from 'react';
// import {
//   ShieldAlert,
//   ShieldCheck,
//   AlertTriangle,
//   AlertOctagon,
//   HeartPulse,
//   Users,
//   Building,
//   Info,
//   CheckCircle2,
//   Sparkles,
// } from 'lucide-react';
// import { useSelectedCity } from '../context/CityContext';
// import { useRiskAssessment } from '../hooks/useRisk';
// import { RiskAssessmentResponse } from '../types/risk';
// import { RiskBadge } from '../components/common/RiskBadge';
// import { CategoryBadge } from '../components/common/CategoryBadge';
// import { DemoBadge } from '../components/common/DemoBadge';
// import { LoadingState } from '../components/common/LoadingState';

// export const PollutionRiskPage: React.FC = () => {
//   const { selectedCity } = useSelectedCity();
//   const riskMutation = useRiskAssessment();
//   const [riskData, setRiskData] = useState<RiskAssessmentResponse | null>(null);
//   const [customAqi, setCustomAqi] = useState<number>(142);

//   // Initial risk assessment fetch
//   React.useEffect(() => {
//     riskMutation.mutate(
//       { city: selectedCity },
//       { onSuccess: (data) => {
//         setRiskData(data);
//         setCustomAqi(data.referenceAqi);
//       }}
//     );
//   }, [selectedCity]);

//   const handleRecalculate = (val: number) => {
//     setCustomAqi(val);
//     riskMutation.mutate(
//       { city: selectedCity, aqi: val },
//       { onSuccess: (data) => setRiskData(data) }
//     );
//   };

//   if (!riskData && riskMutation.isPending) {
//     return <LoadingState message="Conducting exposure risk assessment..." />;
//   }

//   return (
//     <div className="space-y-6">
//       {/* Page Header */}
//       <div>
//         <div className="flex items-center gap-2">
//           <h1 className="text-2xl font-black text-slate-900 tracking-tight">
//             Pollution & Health Risk Exposure Assessment
//           </h1>
//           <DemoBadge variant="subtle" />
//         </div>
//         <p className="text-xs text-slate-500 mt-1">
//           Stratify ambient particulate exposure potential into 4 actionable public health risk tiers (Low, Moderate, High, Severe)
//         </p>
//       </div>

//       {/* Medical Disclaimer Banner */}
//       <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-950">
//         <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
//         <div>
//           <span className="font-bold">Public Health Advisory Notice:</span> The risk levels and recommendations presented below represent general public health advisories calibrated to atmospheric air quality benchmarks.
//           This system <strong>does not diagnose personal medical conditions</strong> or offer personalized clinical treatment prescriptions.
//         </div>
//       </div>

//       {riskData && (
//         <>
//           {/* Main Risk Status Card */}
//           <div className="p-6 bg-white rounded-xl border border-slate-200/90 shadow-xs">
//             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
//               <div>
//                 <div className="flex items-center gap-2">
//                   <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
//                     {riskData.city} Exposure Profile
//                   </span>
//                   <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">
//                     Rule Engine v1
//                   </span>
//                 </div>
//                 <h2 className="text-2xl font-black text-slate-900 mt-1">
//                   {riskData.warningTitle}
//                 </h2>
//                 <p className="text-xs text-slate-500 mt-0.5">{riskData.summary}</p>
//               </div>

//               <div className="flex items-center gap-3">
//                 <div className="text-right">
//                   <span className="text-xs font-semibold text-slate-400 uppercase block">Index Value</span>
//                   <span className="text-3xl font-black font-mono text-slate-900">{riskData.referenceAqi}</span>
//                 </div>
//                 <RiskBadge level={riskData.riskClassification} size="lg" />
//               </div>
//             </div>

//             {/* Simulated AQI slider to dynamically test all 4 risk tiers */}
//             <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
//               <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
//                 <span>Simulate AQI Level for Risk Assessment:</span>
//                 <span className="font-mono text-sm font-bold text-teal-800">{customAqi} AQI</span>
//               </div>
//               <input
//                 type="range"
//                 min="0"
//                 max="450"
//                 value={customAqi}
//                 onChange={(e) => handleRecalculate(parseInt(e.target.value, 10))}
//                 className="w-full accent-teal-700 cursor-pointer"
//               />
//               <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
//                 <span>0 (Low Risk)</span>
//                 <span>50</span>
//                 <span>100 (Mod Risk)</span>
//                 <span>200 (High Risk)</span>
//                 <span>300+ (Severe Risk)</span>
//               </div>
//             </div>

//             {/* Explanation box */}
//             <div className="mt-4 p-3.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-600">
//               <strong className="text-slate-800">Classification Rationale: </strong>
//               {riskData.explanation}
//             </div>
//           </div>

//           {/* Demographic-Specific Guidelines */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {/* General Health Precautions */}
//             <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
//               <div className="flex items-center gap-2 mb-3">
//                 <HeartPulse className="w-4 h-4 text-teal-700" />
//                 <h3 className="text-sm font-bold text-slate-900">
//                   General Population Precautions
//                 </h3>
//               </div>
//               <p className="text-xs text-slate-500 mb-4">Recommended behavioral mitigations for current exposure level</p>

//               <ul className="space-y-3">
//                 {riskData.generalPrecautions.map((prec, i) => (
//                   <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
//                     <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
//                     <span>{prec}</span>
//                   </li>
//                 ))}
//               </ul>
//             </div>

//             {/* Vulnerable Demographic Cohorts */}
//             <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
//               <div className="flex items-center gap-2 mb-3">
//                 <Users className="w-4 h-4 text-teal-700" />
//                 <h3 className="text-sm font-bold text-slate-900">
//                   Vulnerable Cohort Guidelines
//                 </h3>
//               </div>
//               <p className="text-xs text-slate-500 mb-4">Stratified exposure advisories for sensitive biological groups</p>

//               <div className="space-y-3 text-xs">
//                 {riskData.demographicGuidelines.map((demo, idx) => (
//                   <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
//                     <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
//                       <span>{demo.group}</span>
//                       <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
//                         {demo.exposureRisk}
//                       </span>
//                     </div>
//                     <p className="text-slate-600 text-[11px] leading-relaxed">{demo.recommendation}</p>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* National City Risk Comparison */}
//           <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
//             <h3 className="text-sm font-bold text-slate-900 mb-1">
//               Cross-Metro Risk Level Comparison
//             </h3>
//             <p className="text-xs text-slate-500 mb-4">Multi-station comparative risk stratification</p>

//             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
//               {riskData.cityRiskComparison.map((item) => (
//                 <div key={item.city} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
//                   <span className="text-xs font-bold text-slate-800 block">{item.city}</span>
//                   <span className="text-xl font-black font-mono text-slate-900 my-1 block">{item.aqi}</span>
//                   <RiskBadge level={item.risk} size="sm" showIcon={false} />
//                 </div>
//               ))}
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// };
