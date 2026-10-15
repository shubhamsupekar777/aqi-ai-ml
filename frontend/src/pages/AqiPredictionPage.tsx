import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Info,
  SlidersHorizontal,
} from 'lucide-react';

import { useSelectedCity } from '../context/CityContext';
import { useCities } from '../hooks/useOverview';
import { usePrediction } from '../hooks/usePrediction';
import type {
  AdvancedFeaturesInput,
  PredictionHorizon,
  PredictionMode,
  PredictionResponse,
} from '../types/prediction';
import { TrendBadge } from '../components/common/TrendBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { LoadingState } from '../components/common/LoadingState';
import { formatDate, formatTime } from '../lib/formatters';

const optionalNumber = (min: number, max: number) =>
  z.number().min(min).max(max).optional();

const predictionSchema = z.object({
  city: z.string().min(1, 'Select a city.'),
  horizon: z.enum(['next_day', 'next_3_days', 'next_7_days']),
  mode: z.enum(['automatic', 'advanced']),
  pm25: optionalNumber(0, 1000),
  pm10: optionalNumber(0, 1500),
  no2: optionalNumber(0, 500),
  so2: optionalNumber(0, 500),
  co: optionalNumber(0, 100),
  o3: optionalNumber(0, 500),
  temperature: optionalNumber(-20, 60),
  humidity: optionalNumber(0, 100),
  windSpeed: optionalNumber(0, 150),
  rainfall: optionalNumber(0, 500),
});

type FormValues = z.infer<typeof predictionSchema>;

const HORIZONS: Array<{
  value: PredictionHorizon;
  label: string;
  supported: boolean;
}> = [
  { value: 'next_day', label: 'Next day', supported: true },
  { value: 'next_3_days', label: 'Next 3 days', supported: false },
  { value: 'next_7_days', label: 'Next 7 days', supported: false },
];

function getCategoryClasses(category: string): string {
  switch (category) {
    case 'Good':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Satisfactory':
      return 'bg-lime-50 text-lime-800 border-lime-200';
    case 'Moderate':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Poor':
    case 'Unhealthy for Sensitive Groups':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'Very Poor':
    case 'Unhealthy':
      return 'bg-red-50 text-red-800 border-red-200';
    case 'Severe':
    case 'Very Unhealthy':
    case 'Hazardous':
      return 'bg-rose-50 text-rose-900 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function getApiErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return 'The prediction request failed. Please try again.';
  }

  const maybeAxiosError = error as {
    message?: string;
    response?: { data?: { detail?: unknown; message?: unknown } };
  };
  const detail = maybeAxiosError.response?.data?.detail;
  const message = maybeAxiosError.response?.data?.message;

  if (typeof detail === 'string') return detail;
  if (typeof message === 'string') return message;
  if (typeof maybeAxiosError.message === 'string') return maybeAxiosError.message;
  return 'The prediction request failed. Please try again.';
}

export const AqiPredictionPage: React.FC = () => {
  const { selectedCity } = useSelectedCity();
  const {
    data: cities,
    isLoading: citiesLoading,
    error: citiesError,
  } = useCities();
  const predictionMutation = usePrediction();
  const [result, setResult] = useState<PredictionResponse | null>(null);

  // Use the city list returned by the configured data source. Do not silently
  // fall back to a hard-coded list if the API request fails.
  const cityList = useMemo(() => cities ?? [], [cities]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
      city: selectedCity,
      horizon: 'next_day',
      mode: 'automatic',
    },
  });

  const currentMode = watch('mode');
  const selectedHorizon = watch('horizon');

  // Keep the form aligned with the shared selected city; changing the city
  // does not automatically issue a prediction request.
  useEffect(() => {
    if (cityList.length === 0) return;

    const cityExists = cityList.some((city) => city.name === selectedCity);
    const nextCity = cityExists ? selectedCity : cityList[0].name;
    setValue('city', nextCity, { shouldValidate: true });
  }, [selectedCity, cityList, setValue]);

  const onSubmit = (values: FormValues) => {
    if (values.horizon !== 'next_day') {
      return;
    }

    setResult(null);

    let features: AdvancedFeaturesInput | undefined;
    if (values.mode === 'advanced') {
      // Only send fields explicitly entered by the user. The backend builds
      // all remaining model features from the city's stored historical data.
      const overrides: AdvancedFeaturesInput = {
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
      };
      features = Object.fromEntries(
        Object.entries(overrides).filter(([, value]) => value !== undefined),
      ) as AdvancedFeaturesInput;
    }

    predictionMutation.mutate(
      {
        city: values.city,
        horizon: values.horizon as PredictionHorizon,
        mode: values.mode as PredictionMode,
        ...(features && Object.keys(features).length > 0 ? { features } : {}),
      },
      {
        onSuccess: (response) => setResult(response),
      },
    );
  };

  const forecastDate = result?.forecastSeries?.[0]?.date;
  const modelName = result?.metadata?.model_name;
  const isDemoResult = result?.metadata?.is_demo ?? false;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            AQI Regression &amp; Prediction
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800">
            <Brain className="h-3.5 w-3.5" />
            Model prediction
          </span>
        </div>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
          Predict the next day’s AQI using the trained regression model and
          historical observations stored for the selected city. These stored
          observations are not live sensor readings.
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs lg:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <SlidersHorizontal className="h-4 w-4 text-teal-700" />
              Prediction settings
            </h2>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
              Random Forest
            </span>
          </div>

          {citiesLoading && <LoadingState message="Loading cities from the API..." />}

          {!citiesLoading && citiesError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{getApiErrorMessage(citiesError)}</p>
            </div>
          )}

          {!citiesLoading && !citiesError && cityList.length === 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              No cities were returned by the API. Check the backend and database connection.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="prediction-city" className="mb-1 block text-xs font-semibold text-slate-700">
                City
              </label>
              <select
                id="prediction-city"
                {...register('city')}
                disabled={citiesLoading || cityList.length === 0 || predictionMutation.isPending}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {cityList.map((city) => (
                  <option key={city.id || city.name} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
              {errors.city && <p className="mt-1 text-[11px] text-red-600">{errors.city.message}</p>}
            </div>

            <fieldset>
              <legend className="mb-2 block text-xs font-semibold text-slate-700">
                Forecast horizon
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {HORIZONS.map((horizon) => {
                  const isSelected = selectedHorizon === horizon.value;
                  return (
                    <label
                      key={horizon.value}
                      className={`flex min-h-14 flex-col items-center justify-center rounded-lg border p-2 text-center text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50 text-teal-800'
                          : 'border-slate-200 text-slate-500'
                      } ${!horizon.supported ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}
                      title={horizon.supported ? 'Supported by the currently trained model' : 'Not implemented by the current model'}
                    >
                      <input
                        type="radio"
                        value={horizon.value}
                        {...register('horizon')}
                        disabled={!horizon.supported || predictionMutation.isPending}
                        className="sr-only"
                      />
                      <span>{horizon.label}</span>
                      {!horizon.supported && <span className="mt-0.5 text-[9px] font-normal">Unavailable</span>}
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-4 text-slate-500">
                The deployed model predicts one day ahead only. Longer horizons are disabled rather than showing an unimplemented forecast.
              </p>
            </fieldset>

            <fieldset>
              <legend className="mb-2 block text-xs font-semibold text-slate-700">
                Input strategy
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <label className={`rounded-lg border p-3 text-xs transition-colors ${currentMode === 'automatic' ? 'border-teal-600 bg-teal-50 text-teal-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  <input
                    type="radio"
                    value="automatic"
                    {...register('mode')}
                    disabled={predictionMutation.isPending}
                    className="sr-only"
                  />
                  <span className="block font-bold">Automatic</span>
                  <span className="mt-1 block text-[10px] leading-4 text-slate-500">
                    Use database history and weather features
                  </span>
                </label>
                <label className={`rounded-lg border p-3 text-xs transition-colors ${currentMode === 'advanced' ? 'border-teal-600 bg-teal-50 text-teal-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  <input
                    type="radio"
                    value="advanced"
                    {...register('mode')}
                    disabled={predictionMutation.isPending}
                    className="sr-only"
                  />
                  <span className="block font-bold">Advanced</span>
                  <span className="mt-1 block text-[10px] leading-4 text-slate-500">
                    Override selected values; use history for the rest
                  </span>
                </label>
              </div>
            </fieldset>

            {currentMode === 'advanced' && (
              <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Optional feature overrides</h3>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">
                    Leave a field blank to use the corresponding stored value. Values are model inputs, not new sensor measurements.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="override-pm25" className="mb-1 block text-[11px] font-medium text-slate-600">PM2.5 (µg/m³)</label>
                    <input id="override-pm25" type="number" min="0" max="1000" step="any" {...register('pm25', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.pm25 && <p className="mt-1 text-[10px] text-red-600">{errors.pm25.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="override-pm10" className="mb-1 block text-[11px] font-medium text-slate-600">PM10 (µg/m³)</label>
                    <input id="override-pm10" type="number" min="0" max="1500" step="any" {...register('pm10', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.pm10 && <p className="mt-1 text-[10px] text-red-600">{errors.pm10.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="override-no2" className="mb-1 block text-[11px] font-medium text-slate-600">NO₂ (µg/m³)</label>
                    <input id="override-no2" type="number" min="0" max="500" step="any" {...register('no2', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.no2 && <p className="mt-1 text-[10px] text-red-600">{errors.no2.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="override-so2" className="mb-1 block text-[11px] font-medium text-slate-600">SO₂ (µg/m³)</label>
                    <input id="override-so2" type="number" min="0" max="500" step="any" {...register('so2', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.so2 && <p className="mt-1 text-[10px] text-red-600">{errors.so2.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="override-co" className="mb-1 block text-[11px] font-medium text-slate-600">CO (mg/m³)</label>
                    <input id="override-co" type="number" min="0" max="100" step="any" {...register('co', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.co && <p className="mt-1 text-[10px] text-red-600">{errors.co.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="override-o3" className="mb-1 block text-[11px] font-medium text-slate-600">O₃ (µg/m³)</label>
                    <input id="override-o3" type="number" min="0" max="500" step="any" {...register('o3', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.o3 && <p className="mt-1 text-[10px] text-red-600">{errors.o3.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="override-temperature" className="mb-1 block text-[11px] font-medium text-slate-600">Temperature (°C)</label>
                    <input id="override-temperature" type="number" min="-20" max="60" step="any" {...register('temperature', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.temperature && <p className="mt-1 text-[10px] text-red-600">{errors.temperature.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="override-humidity" className="mb-1 block text-[11px] font-medium text-slate-600">Humidity (%)</label>
                    <input id="override-humidity" type="number" min="0" max="100" step="any" {...register('humidity', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.humidity && <p className="mt-1 text-[10px] text-red-600">{errors.humidity.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="override-wind" className="mb-1 block text-[11px] font-medium text-slate-600">Wind speed (km/h)</label>
                    <input id="override-wind" type="number" min="0" max="150" step="any" {...register('windSpeed', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.windSpeed && <p className="mt-1 text-[10px] text-red-600">{errors.windSpeed.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="override-rainfall" className="mb-1 block text-[11px] font-medium text-slate-600">Rainfall (mm)</label>
                    <input id="override-rainfall" type="number" min="0" max="500" step="any" {...register('rainfall', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.rainfall && <p className="mt-1 text-[10px] text-red-600">{errors.rainfall.message}</p>}
                  </div>
                </div>
              </section>
            )}

            <button
              type="submit"
              disabled={predictionMutation.isPending || citiesLoading || cityList.length === 0 || Boolean(citiesError)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {predictionMutation.isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating prediction...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Predict next-day AQI
                </>
              )}
            </button>
          </form>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-4 text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <p>
              Automatic mode uses the stored data for the selected city. Advanced mode changes only the inputs you enter. Neither mode fetches live pollution measurements.
            </p>
          </div>
        </section>

        <section className="space-y-5 lg:col-span-7" aria-live="polite">
          {predictionMutation.isPending && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <LoadingState message="Running the trained next-day AQI model..." />
            </div>
          )}

          {predictionMutation.error && !predictionMutation.isPending && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h2 className="text-sm font-bold">Prediction could not be generated</h2>
                <p className="mt-1 text-xs leading-5">{getApiErrorMessage(predictionMutation.error)}</p>
              </div>
            </div>
          )}

          {!result && !predictionMutation.isPending && !predictionMutation.error && (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <Brain className="h-9 w-9 text-teal-700" />
              <h2 className="mt-3 text-base font-bold text-slate-900">Ready to predict</h2>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                Select a city and input strategy, then run the model. Results will appear here after the API returns a successful prediction.
              </p>
            </div>
          )}

          {result && !predictionMutation.isPending && (
            <>
              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{result.city} next-day AQI prediction</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Generated {formatTime(result.predictionTimestamp)}
                      {forecastDate ? ` · Target date: ${formatDate(forecastDate)}` : ''}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Model: {modelName || 'Model name not supplied'}
                    </p>
                  </div>
                  <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getCategoryClasses(result.category)}`}>
                    {result.category}
                  </span>
                </div>

                {isDemoResult && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    This response is marked as demonstration output by the API. Check that the frontend is in API mode and the backend is configured for the trained model.
                  </div>
                )}

                <div className="my-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reference AQI</p>
                    <p className="mt-1 font-mono text-3xl font-extrabold text-slate-800">{Number.isFinite(result.referenceAqi) ? result.referenceAqi.toFixed(1) : 'N/A'}</p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">Baseline derived from stored data or supplied model inputs.</p>
                  </div>
                  <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800">Predicted AQI</p>
                    <p className="mt-1 font-mono text-4xl font-black text-teal-800">{Number.isFinite(result.predictedAqi) ? result.predictedAqi.toFixed(2) : 'N/A'}</p>
                    {result.confidenceInterval && (
                      <p className="mt-1 text-[11px] text-teal-800">
                        Prediction interval: {result.confidenceInterval.lower.toFixed(1)}–{result.confidenceInterval.upper.toFixed(1)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <div className="flex min-w-28 flex-1 flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Predicted trend</span>
                    <TrendBadge trend={result.trend} size="sm" />
                  </div>
                  <div className="flex min-w-28 flex-1 flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Risk assessment</span>
                    <RiskBadge level={result.riskLevel} size="sm" />
                  </div>
                  <div className="flex min-w-28 flex-1 flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Model status</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {result.metadata?.model_status ?? 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Info className="h-4 w-4 text-teal-700" />
                    Model explanation
                  </h3>
                  <p className="text-xs leading-5 text-slate-700">
                    {result.explanation || 'The API did not return an explanation for this prediction.'}
                  </p>
                </div>

                {result.featureDrivers && result.featureDrivers.length > 0 ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <h3 className="mb-2 text-xs font-bold text-slate-800">Feature attribution</h3>
                    <div className="space-y-2">
                      {result.featureDrivers.map((driver, index) => (
                        <div key={`${driver.feature}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-slate-600">{driver.feature}</span>
                          <span className="font-mono text-slate-700">{Math.round(driver.weight * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-[11px] leading-4 text-slate-500">
                    Feature attribution and calibrated prediction intervals are not currently supplied by the backend model response.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600">
                <p className="font-semibold text-slate-800">Interpreting this result</p>
                <p className="mt-1">
                  This is a model-generated estimate for the target date, not a direct measurement. Accuracy depends on the availability and quality of the historical AQI, pollutant, weather, and time-series features used for inference.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
