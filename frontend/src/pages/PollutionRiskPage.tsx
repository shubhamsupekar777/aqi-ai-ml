import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  HeartPulse,
  Users,
  Building,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useSelectedCity } from '../context/CityContext';
import { useRiskAssessment } from '../hooks/useRisk';
import { RiskAssessmentResponse } from '../types/risk';
import { RiskBadge } from '../components/common/RiskBadge';
import { CategoryBadge } from '../components/common/CategoryBadge';
import { DemoBadge } from '../components/common/DemoBadge';
import { LoadingState } from '../components/common/LoadingState';

export const PollutionRiskPage: React.FC = () => {
  const { selectedCity } = useSelectedCity();
  const riskMutation = useRiskAssessment();
  const [riskData, setRiskData] = useState<RiskAssessmentResponse | null>(null);
  const [customAqi, setCustomAqi] = useState<number>(142);

  // Initial risk assessment fetch
  React.useEffect(() => {
    riskMutation.mutate(
      { city: selectedCity },
      { onSuccess: (data) => {
        setRiskData(data);
        setCustomAqi(data.referenceAqi);
      }}
    );
  }, [selectedCity]);

  const handleRecalculate = (val: number) => {
    setCustomAqi(val);
    riskMutation.mutate(
      { city: selectedCity, aqi: val },
      { onSuccess: (data) => setRiskData(data) }
    );
  };

  if (!riskData && riskMutation.isPending) {
    return <LoadingState message="Conducting exposure risk assessment..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Pollution & Health Risk Exposure Assessment
          </h1>
          <DemoBadge variant="subtle" />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Stratify ambient particulate exposure potential into 4 actionable public health risk tiers (Low, Moderate, High, Severe)
        </p>
      </div>

      {/* Medical Disclaimer Banner */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-950">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Public Health Advisory Notice:</span> The risk levels and recommendations presented below represent general public health advisories calibrated to atmospheric air quality benchmarks.
          This system <strong>does not diagnose personal medical conditions</strong> or offer personalized clinical treatment prescriptions.
        </div>
      </div>

      {riskData && (
        <>
          {/* Main Risk Status Card */}
          <div className="p-6 bg-white rounded-xl border border-slate-200/90 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {riskData.city} Exposure Profile
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                    Rule Engine v1
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  {riskData.warningTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{riskData.summary}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-400 uppercase block">Index Value</span>
                  <span className="text-3xl font-black font-mono text-slate-900">{riskData.referenceAqi}</span>
                </div>
                <RiskBadge level={riskData.riskClassification} size="lg" />
              </div>
            </div>

            {/* Simulated AQI slider to dynamically test all 4 risk tiers */}
            <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                <span>Simulate AQI Level for Risk Assessment:</span>
                <span className="font-mono text-sm font-bold text-teal-800">{customAqi} AQI</span>
              </div>
              <input
                type="range"
                min="0"
                max="450"
                value={customAqi}
                onChange={(e) => handleRecalculate(parseInt(e.target.value, 10))}
                className="w-full accent-teal-700 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span>0 (Low Risk)</span>
                <span>50</span>
                <span>100 (Mod Risk)</span>
                <span>200 (High Risk)</span>
                <span>300+ (Severe Risk)</span>
              </div>
            </div>

            {/* Explanation box */}
            <div className="mt-4 p-3.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-600">
              <strong className="text-slate-800">Classification Rationale: </strong>
              {riskData.explanation}
            </div>
          </div>

          {/* Demographic-Specific Guidelines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Health Precautions */}
            <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <HeartPulse className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  General Population Precautions
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">Recommended behavioral mitigations for current exposure level</p>

              <ul className="space-y-3">
                {riskData.generalPrecautions.map((prec, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>{prec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Vulnerable Demographic Cohorts */}
            <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Vulnerable Cohort Guidelines
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">Stratified exposure advisories for sensitive biological groups</p>

              <div className="space-y-3 text-xs">
                {riskData.demographicGuidelines.map((demo, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                      <span>{demo.group}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                        {demo.exposureRisk}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{demo.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* National City Risk Comparison */}
          <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Cross-Metro Risk Level Comparison
            </h3>
            <p className="text-xs text-slate-500 mb-4">Multi-station comparative risk stratification</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {riskData.cityRiskComparison.map((item) => (
                <div key={item.city} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <span className="text-xs font-bold text-slate-800 block">{item.city}</span>
                  <span className="text-xl font-black font-mono text-slate-900 my-1 block">{item.aqi}</span>
                  <RiskBadge level={item.risk} size="sm" showIcon={false} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
