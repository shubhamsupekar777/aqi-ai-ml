import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Brain,
  Sparkles,
  Sliders,
  Calendar,
  AlertCircle,
  TrendingUp,
  ShieldAlert,
  Clock,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useSelectedCity } from '../context/CityContext';
import { useCities } from '../hooks/useOverview';
import { usePrediction } from '../hooks/usePrediction';
import { PredictionHorizon, PredictionMode, PredictionResponse } from '../types/prediction';
import { CategoryBadge } from '../components/common/CategoryBadge';
import { TrendBadge } from '../components/common/TrendBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { ForecastChart } from '../components/charts/ForecastChart';
import { DemoBadge } from '../components/common/DemoBadge';
import { LoadingState } from '../components/common/LoadingState';
import { formatTime } from '../lib/formatters';

const predictionSchema = z.object({
  city: z.string().min(1, 'City is required'),
  horizon: z.enum(['next_day', 'next_3_days', 'next_7_days']),
  mode: z.enum(['automatic', 'advanced']),
  pm25: z.number().min(0).max(1000).optional(),
  pm10: z.number().min(0).max(1500).optional(),
  no2: z.number().min(0).max(500).optional(),
  so2: z.number().min(0).max(500).optional(),
  co: z.number().min(0).max(100).optional(),
  o3: z.number().min(0).max(500).optional(),
  temperature: z.number().min(-20).max(60).optional(),
  humidity: z.number().min(0).max(100).optional(),
  windSpeed: z.number().min(0).max(150).optional(),
  rainfall: z.number().min(0).max(500).optional(),
});

type FormValues = z.infer<typeof predictionSchema>;

export const AqiPredictionPage: React.FC = () => {
  const { selectedCity } = useSelectedCity();
  const { data: cities } = useCities();
  const predictionMutation = usePrediction();
  const [result, setResult] = useState<PredictionResponse | null>(null);

  const cityList = cities || [
    { id: 'delhi', name: 'Delhi' },
    { id: 'mumbai', name: 'Mumbai' },
    { id: 'pune', name: 'Pune' },
    { id: 'bengaluru', name: 'Bengaluru' },
    { id: 'chennai', name: 'Chennai' },
    { id: 'hyderabad', name: 'Hyderabad' }
  ];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
      city: selectedCity,
      horizon: 'next_day',
      mode: 'automatic',
      pm25: 85,
      pm10: 145,
      no2: 38,
      so2: 14,
      co: 1.2,
      o3: 42,
      temperature: 28,
      humidity: 55,
      windSpeed: 8,
      rainfall: 0,
    },
  });

  const currentMode = watch('mode');

  // Trigger initial prediction on mount if empty
  React.useEffect(() => {
    predictionMutation.mutate(
      {
        city: selectedCity,
        horizon: 'next_day',
        mode: 'automatic',
      },
      {
        onSuccess: (data) => setResult(data),
      }
    );
  }, [selectedCity]);

  const onSubmit = (values: FormValues) => {
    predictionMutation.mutate(
      {
        city: values.city,
        horizon: values.horizon as PredictionHorizon,
        mode: values.mode as PredictionMode,
        features:
          values.mode === 'advanced'
            ? {
                pm25: values.pm25,
                pm10: values.pm10,
                no2: values.no2,
                so2: values.so2,
                co: values.co,
                o3: values.o3,
                temperature: values.temperature,
                humidity: values.humidity,
                windSpeed: values.windSpeed,
                rainfall: values.rainfall,
              }
            : undefined,
      },
      {
        onSuccess: (data) => setResult(data),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            AQI Regression & Forecasting
          </h1>
          <DemoBadge variant="subtle" />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Predict continuous numerical Air Quality Index (AQI) values across future time horizons using historical observations and meteorological features
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Input Form */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Brain className="w-4 h-4 text-teal-700" />
              <span>Inference Parameters</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Regression Mode
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* City Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Geographic Area
              </label>
              <select
                {...register('city')}
                className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                {cityList.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.city && <p className="text-[11px] text-red-500 mt-1">{errors.city.message}</p>}
            </div>

            {/* Prediction Horizon */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Forecast Horizon
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'next_day', label: 'Next Day' },
                  { value: 'next_3_days', label: 'Next 3 Days' },
                  { value: 'next_7_days', label: 'Next 7 Days' },
                ].map((h) => (
                  <label
                    key={h.value}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                      watch('horizon') === h.value
                        ? 'bg-teal-50 border-teal-600 text-teal-800 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      value={h.value}
                      {...register('horizon')}
                      className="sr-only"
                    />
                    <span>{h.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Prediction Mode: Automatic vs Advanced */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inference Input Strategy
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    currentMode === 'automatic'
                      ? 'bg-teal-50 border-teal-600 text-teal-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    value="automatic"
                    {...register('mode')}
                    className="sr-only"
                  />
                  <div className="font-bold">Automatic Mode</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                    Use historical sensor & weather features
                  </div>
                </label>

                <label
                  className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    currentMode === 'advanced'
                      ? 'bg-teal-50 border-teal-600 text-teal-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    value="advanced"
                    {...register('mode')}
                    className="sr-only"
                  />
                  <div className="font-bold">Advanced Mode</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                    Customize pollutant & weather values
                  </div>
                </label>
              </div>
            </div>

            {/* Advanced Input Sliders */}
            {currentMode === 'advanced' && (
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-teal-600" />
                    Custom Chemical & Meteorological Features
                  </span>
                  <span className="text-[10px] text-slate-500">Optional Overrides</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">PM2.5 (µg/m³)</label>
                    <input
                      type="number"
                      step="any"
                      {...register('pm25', { valueAsNumber: true })}
                      className="w-full text-xs font-mono p-1.5 bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">PM10 (µg/m³)</label>
                    <input
                      type="number"
                      step="any"
                      {...register('pm10', { valueAsNumber: true })}
                      className="w-full text-xs font-mono p-1.5 bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">Wind Speed (km/h)</label>
                    <input
                      type="number"
                      step="any"
                      {...register('windSpeed', { valueAsNumber: true })}
                      className="w-full text-xs font-mono p-1.5 bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">Temperature (°C)</label>
                    <input
                      type="number"
                      step="any"
                      {...register('temperature', { valueAsNumber: true })}
                      className="w-full text-xs font-mono p-1.5 bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">Relative Humidity (%)</label>
                    <input
                      type="number"
                      step="any"
                      {...register('humidity', { valueAsNumber: true })}
                      className="w-full text-xs font-mono p-1.5 bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600">Rainfall (mm)</label>
                    <input
                      type="number"
                      step="any"
                      {...register('rainfall', { valueAsNumber: true })}
                      className="w-full text-xs font-mono p-1.5 bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={predictionMutation.isPending}
              className="w-full py-2.5 px-4 bg-teal-700 text-white font-bold text-xs rounded-lg hover:bg-teal-800 transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {predictionMutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Computing Prediction...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  <span>Predict Air Quality Index</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right column: Prediction Result Display */}
        <div className="lg:col-span-7 space-y-6">
          {predictionMutation.isPending && (
            <LoadingState message="Executing atmospheric regression simulation..." />
          )}

          {result && !predictionMutation.isPending && (
            <>
              {/* Primary Prediction Result Card */}
              <div className="p-6 bg-white rounded-xl border border-slate-200/90 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {result.city} AQI Prediction
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Demo Output
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Forecast Horizon: <strong className="capitalize">{result.horizon.replace('_', ' ')}</strong> • Generated at {formatTime(result.predictionTimestamp)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <CategoryBadge category={result.category} size="md" />
                  </div>
                </div>

                {/* Big Metric Display */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Reference Baseline</span>
                    <div className="text-3xl font-extrabold text-slate-800 font-mono mt-1">
                      {result.referenceAqi}
                    </div>
                    <span className="text-[11px] text-slate-400">Current Station Index</span>
                  </div>

                  <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 text-center">
                    <span className="text-xs font-semibold text-teal-800 uppercase">Predicted AQI</span>
                    <div className="text-4xl font-black text-teal-700 font-mono mt-1">
                      {result.predictedAqi}
                    </div>
                    {result.confidenceInterval && (
                      <span className="text-[11px] text-teal-700 font-mono">
                        90% CI: [{result.confidenceInterval.lower} – {result.confidenceInterval.upper}]
                      </span>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center flex flex-col justify-center items-center">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Trajectory & Risk</span>
                    <div className="mt-2 flex flex-col items-center gap-1.5">
                      <TrendBadge trend={result.trend} size="sm" />
                      <RiskBadge level={result.riskLevel} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Explanation text */}
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                  <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-teal-600" />
                    Model Decision & Trajectory Rationale
                  </div>
                  {result.explanation}
                </div>

                {/* Feature Drivers */}
                {result.featureDrivers && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 mb-2">Key Atmospheric Drivers (SHAP / Feature Attribution)</h4>
                    <div className="space-y-2">
                      {result.featureDrivers.map((driver, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">{driver.feature}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-600 rounded-full"
                                style={{ width: `${driver.weight * 100}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-slate-500 w-8 text-right">
                              {Math.round(driver.weight * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Trajectory visualization chart */}
              {result.forecastSeries && (
                <ForecastChart
                  data={result.forecastSeries.map(p => ({
                    date: p.date,
                    aqi: p.predictedAqi,
                    category: p.category,
                    isForecast: true,
                    lowerBound: p.confidenceLower,
                    upperBound: p.confidenceUpper
                  }))}
                  title={`${result.city} Predicted AQI Trajectory`}
                  subtitle={`Projected continuous progression across selected horizon`}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
