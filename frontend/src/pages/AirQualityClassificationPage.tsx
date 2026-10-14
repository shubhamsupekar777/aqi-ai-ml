import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  History,
  Shield,
  BarChart,
  ArrowRight,
} from 'lucide-react';
import { useSelectedCity } from '../context/CityContext';
import { useCities } from '../hooks/useOverview';
import { useClassification } from '../hooks/useClassification';
import { ClassificationResponse } from '../types/classification';
import { US_EPA_CATEGORIES, CPCB_CATEGORIES, getCategoryDefinition } from '../lib/aqi';
import { CategoryBadge } from '../components/common/CategoryBadge';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { DemoBadge } from '../components/common/DemoBadge';
import { LoadingState } from '../components/common/LoadingState';
import { formatTime } from '../lib/formatters';

const classificationSchema = z.object({
  aqi: z.number().min(0, 'AQI must be >= 0').max(1000, 'AQI must be <= 1000'),
  city: z.string().optional(),
  scheme: z.enum(['US_EPA', 'INDIA_CPCB']),
});

type FormValues = z.infer<typeof classificationSchema>;

export const AirQualityClassificationPage: React.FC = () => {
  const { selectedCity } = useSelectedCity();
  const { data: cities } = useCities();
  const classificationMutation = useClassification();
  const [result, setResult] = useState<ClassificationResponse | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(classificationSchema),
    defaultValues: {
      aqi: 142,
      city: selectedCity,
      scheme: 'US_EPA',
    },
  });

  const selectedScheme = watch('scheme');

  // Initial classification run
  React.useEffect(() => {
    classificationMutation.mutate(
      { aqi: 142, city: selectedCity, scheme: 'US_EPA' },
      { onSuccess: (data) => setResult(data) }
    );
  }, [selectedCity]);

  const onSubmit = (values: FormValues) => {
    classificationMutation.mutate(
      { aqi: values.aqi, city: values.city || selectedCity, scheme: values.scheme },
      { onSuccess: (data) => setResult(data) }
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Air Quality Regulatory Classification
          </h1>
          <DemoBadge variant="subtle" />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Stratify numerical atmospheric particulate observations into standardized regulatory health severity tiers
        </p>
      </div>

      {/* Standards Disclaimer Banner */}
      <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3 text-xs text-teal-900">
        <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Standard Differentiation Note:</span> This platform defaults to the
          six-category <strong className="underline">US EPA AQI scheme</strong> (Good, Moderate, Unhealthy for Sensitive Groups, Unhealthy, Very Unhealthy, Hazardous).
          The Indian CPCB NAQI standard uses distinct buckets (Good, Satisfactory, Moderate, Poor, Very Poor, Severe) with differing numerical thresholds.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Input */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-700" />
              <span>Classification Inputs</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">
              Deterministic Classifier
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Regulatory Standard Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Classification Regulatory Standard
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    selectedScheme === 'US_EPA'
                      ? 'bg-teal-50 border-teal-600 text-teal-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    value="US_EPA"
                    {...register('scheme')}
                    className="sr-only"
                  />
                  <div className="font-bold">US EPA Standard</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                    6 Regulatory Tiers (0–500)
                  </div>
                </label>

                <label
                  className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    selectedScheme === 'INDIA_CPCB'
                      ? 'bg-teal-50 border-teal-600 text-teal-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    value="INDIA_CPCB"
                    {...register('scheme')}
                    className="sr-only"
                  />
                  <div className="font-bold">Indian CPCB NAQI</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                    6 National Buckets (0–500)
                  </div>
                </label>
              </div>
            </div>

            {/* Numerical AQI Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Numerical AQI Value
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  {...register('aqi', { valueAsNumber: true })}
                  className="w-full text-lg font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 pl-3 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 shadow-2xs"
                  placeholder="e.g. 142"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-slate-400 font-mono">
                  INDEX
                </span>
              </div>
              {errors.aqi && <p className="text-[11px] text-red-500 mt-1">{errors.aqi.message}</p>}

              {/* Quick sample chips */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium">Quick presets:</span>
                {[35, 75, 125, 175, 245, 380].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setValue('aqi', sample)}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* Classify Button */}
            <button
              type="submit"
              disabled={classificationMutation.isPending}
              className="w-full py-2.5 px-4 bg-teal-700 text-white font-bold text-xs rounded-lg hover:bg-teal-800 transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              {classificationMutation.isPending ? (
                <span>Mapping Regulatory Tiers...</span>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Classify Severity Tier</span>
                </>
              )}
            </button>
          </form>

          {/* Standards Breakpoint Matrix Table */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">
              {selectedScheme === 'US_EPA' ? 'US EPA Category Breakpoints' : 'India CPCB NAQI Breakpoints'}
            </h4>
            <div className="space-y-1.5">
              {(selectedScheme === 'US_EPA' ? US_EPA_CATEGORIES : CPCB_CATEGORIES).map((c) => (
                <div
                  key={c.category}
                  className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="font-medium text-slate-800">{c.category}</span>
                  </div>
                  <span className="font-mono text-slate-500 text-[11px]">
                    {c.min} – {c.max}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Classification Result Display */}
        <div className="lg:col-span-7 space-y-6">
          {classificationMutation.isPending && (
            <LoadingState message="Evaluating regulatory category thresholds..." />
          )}

          {result && !classificationMutation.isPending && (
            <>
              {/* Primary Result Banner Card */}
              <div
                className="p-6 rounded-xl border shadow-xs bg-white"
                style={{ borderLeftWidth: '6px', borderLeftColor: result.color }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Assigned Regulatory Classification
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 mt-0.5" style={{ color: result.color }}>
                      {result.category}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black font-mono text-slate-900">
                      {result.aqi}
                    </span>
                    <span className="text-xs font-bold text-slate-400 font-mono">AQI</span>
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900">Category Health Statement:</h4>
                    <p className="text-slate-600 mt-0.5">{result.healthStatement}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900">Cautionary Guidance:</h4>
                    <p className="text-slate-600 mt-0.5">{result.cautionaryStatement}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
                    <strong className="text-slate-900">Classification Method: </strong>
                    {result.explanation}
                  </div>
                </div>

                {/* Model Confidence Notice */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Engine: Deterministic Centralized Threshold Engine</span>
                  <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    ML Probabilities Un-Fabricated
                  </span>
                </div>
              </div>

              {/* Category Distribution Chart */}
              <CategoryPieChart
                data={result.categoryDistribution}
                title="Historical Classification Frequency Distribution"
              />

              {/* Classification History Log */}
              {result.history && (
                <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <History className="w-4 h-4 text-teal-700" />
                      <span>Recent Classification Audit Trail</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">Session Log</span>
                  </div>

                  <div className="space-y-2">
                    {result.history.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-800">{h.city}</span>
                          <span className="font-mono font-bold text-slate-700">AQI {h.aqi}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CategoryBadge category={h.category} size="sm" />
                          <span className="text-[10px] text-slate-400 font-mono">{formatTime(h.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
