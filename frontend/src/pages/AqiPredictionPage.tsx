
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { fetchPredictionFeatureDefaults } from '../services/predictionService';
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
  horizon: z.enum(['next_day', 'next_3_days']),
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

const OVERRIDE_FIELDS = [
  { formKey: 'pm25', featureKey: 'pm25' },
  { formKey: 'pm10', featureKey: 'pm10' },
  { formKey: 'no2', featureKey: 'no2' },
  { formKey: 'so2', featureKey: 'so2' },
  { formKey: 'co', featureKey: 'co' },
  { formKey: 'o3', featureKey: 'o3' },
  { formKey: 'temperature', featureKey: 'temperature' },
  { formKey: 'humidity', featureKey: 'humidity' },
  { formKey: 'windSpeed', featureKey: 'windSpeed' },
  { formKey: 'rainfall', featureKey: 'rainfall' },
] as const;

const HORIZONS: Array<{
  value: PredictionHorizon;
  label: string;
}> = [
  { value: 'next_day', label: 'Next day' },
  { value: 'next_3_days', label: '3 days ahead' },
];

function getHorizonLabel(horizon: PredictionHorizon): string {
  return horizon === 'next_3_days' ? '3-day-ahead' : 'next-day';
}

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
  if (typeof maybeAxiosError.message === 'string') {
    return maybeAxiosError.message;
  }

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

  // Use the city list returned by the configured data source.
  // Do not silently fall back to a hard-coded list if the API fails.
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
  const formCity = watch('city');

  // Fetch the selected city's latest stored features for Advanced Mode.
  // This GET request does not run a prediction or write to the database.
  const featureDefaultsQuery = useQuery({
    queryKey: ['prediction-feature-defaults', formCity],
    queryFn: () => fetchPredictionFeatureDefaults(formCity),
    enabled: Boolean(formCity),
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const lastPrefilledKey = useRef<string | null>(null);
  const previousFormCity = useRef(formCity);

  // Keep the form aligned with the shared selected city.
  // Changing the city does not automatically issue a prediction.
  useEffect(() => {
    if (cityList.length === 0) return;

    const cityExists = cityList.some(
      (city) => city.name === selectedCity,
    );
    const nextCity = cityExists ? selectedCity : cityList[0].name;

    setValue('city', nextCity, { shouldValidate: true });
  }, [selectedCity, cityList, setValue]);

  // Clear previous-city values while the new city's values load.
  useEffect(() => {
    if (previousFormCity.current === formCity) return;

    previousFormCity.current = formCity;
    lastPrefilledKey.current = null;

    OVERRIDE_FIELDS.forEach(({ formKey }) => {
      setValue(formKey, undefined, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    });
  }, [formCity, setValue]);

  // Prefill once per selected city's latest observation.
  // Refetching the same observation must not overwrite user edits.
  useEffect(() => {
    const defaults = featureDefaultsQuery.data;
    if (!defaults) return;

    const prefillKey = `${defaults.city}|${defaults.observationDate}`;
    if (lastPrefilledKey.current === prefillKey) return;

    OVERRIDE_FIELDS.forEach(({ formKey, featureKey }) => {
      const value = defaults.features[featureKey];

      setValue(
        formKey,
        typeof value === 'number' && Number.isFinite(value)
          ? value
          : undefined,
        {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        },
      );
    });

    lastPrefilledKey.current = prefillKey;
  }, [featureDefaultsQuery.data, setValue]);

  const restoreStoredValues = () => {
    const defaults = featureDefaultsQuery.data;
    if (!defaults) return;

    OVERRIDE_FIELDS.forEach(({ formKey, featureKey }) => {
      const value = defaults.features[featureKey];

      setValue(
        formKey,
        typeof value === 'number' && Number.isFinite(value)
          ? value
          : undefined,
        {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        },
      );
    });
  };

  const onSubmit = (values: FormValues) => {
    // Both supported horizons are submitted to the API.
    // The backend must route each horizon to its corresponding model.
    setResult(null);

    let features: AdvancedFeaturesInput | undefined;

    if (values.mode === 'advanced') {
      // Send only values that differ from the retrieved stored baseline.
      // The backend builds the remaining model features from history.
      const overrides: AdvancedFeaturesInput = {};
      const storedFeatures = featureDefaultsQuery.data?.features;

      OVERRIDE_FIELDS.forEach(({ formKey, featureKey }) => {
        const enteredValue = values[formKey];
        const storedValue = storedFeatures?.[featureKey];

        if (
          typeof enteredValue === 'number' &&
          (
            typeof storedValue !== 'number' ||
            Math.abs(enteredValue - storedValue) > 1e-9
          )
        ) {
          (overrides as Record<string, number>)[featureKey] = enteredValue;
        }
      });

      features =
        Object.keys(overrides).length > 0 ? overrides : undefined;
    }

    predictionMutation.mutate(
      {
        city: values.city,
        horizon: values.horizon,
        mode: values.mode as PredictionMode,
        ...(features && Object.keys(features).length > 0
          ? { features }
          : {}),
      },
      {
        onSuccess: (response) => setResult(response),
      },
    );
  };

  const forecastDate = result?.forecastSeries?.[0]?.date;
  const modelName = result?.metadata?.model_name;
  const isDemoResult = result?.metadata?.is_demo ?? false;

  const selectedHorizonLabel = getHorizonLabel(selectedHorizon);
  const resultHorizonLabel = result
    ? getHorizonLabel(result.horizon)
    : selectedHorizonLabel;

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
          Predict AQI for the next day or three days ahead using trained
          regression models and historical observations stored for the
          selected city. These stored observations are not live sensor
          readings.
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

          {citiesLoading && (
            <LoadingState message="Loading cities from the API..." />
          )}

          {!citiesLoading && citiesError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{getApiErrorMessage(citiesError)}</p>
            </div>
          )}

          {!citiesLoading && !citiesError && cityList.length === 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              No cities were returned by the API. Check the backend and
              database connection.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label
                htmlFor="prediction-city"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                City
              </label>

              <select
                id="prediction-city"
                {...register('city')}
                disabled={
                  citiesLoading ||
                  cityList.length === 0 ||
                  predictionMutation.isPending
                }
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {cityList.map((city) => (
                  <option key={city.id || city.name} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>

              {errors.city && (
                <p className="mt-1 text-[11px] text-red-600">
                  {errors.city.message}
                </p>
              )}
            </div>

            <fieldset>
              <legend className="mb-2 block text-xs font-semibold text-slate-700">
                Prediction horizon
              </legend>

              <div className="grid grid-cols-2 gap-2">
                {HORIZONS.map((horizon) => {
                  const isSelected = selectedHorizon === horizon.value;

                  return (
                    <label
                      key={horizon.value}
                      className={`flex min-h-14 flex-col items-center justify-center rounded-lg border p-2 text-center text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50 text-teal-800'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      } ${
                        predictionMutation.isPending
                          ? 'cursor-not-allowed opacity-50'
                          : 'cursor-pointer'
                      }`}
                      title={
                        horizon.value === 'next_day'
                          ? 'Predict AQI for the next day'
                          : 'Predict one AQI value three days ahead'
                      }
                    >
                      <input
                        type="radio"
                        value={horizon.value}
                        {...register('horizon')}
                        disabled={predictionMutation.isPending}
                        className="sr-only"
                      />
                      <span>{horizon.label}</span>
                      <span className="mt-0.5 text-[9px] font-normal">
                        {horizon.value === 'next_day'
                          ? '1-day model'
                          : '3-day model'}
                      </span>
                    </label>
                  );
                })}
              </div>

              <p className="mt-2 text-[11px] leading-4 text-slate-500">
                {selectedHorizon === 'next_3_days'
                  ? 'The 3-day model predicts one AQI value for the target date three days ahead. It does not generate separate predictions for each of the three days.'
                  : 'The next-day model predicts one AQI value for the next day. Its existing behavior is preserved.'}
              </p>
            </fieldset>

            <fieldset>
              <legend className="mb-2 block text-xs font-semibold text-slate-700">
                Input strategy
              </legend>

              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`rounded-lg border p-3 text-xs transition-colors ${
                    currentMode === 'automatic'
                      ? 'border-teal-600 bg-teal-50 text-teal-900'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
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

                <label
                  className={`rounded-lg border p-3 text-xs transition-colors ${
                    currentMode === 'advanced'
                      ? 'border-teal-600 bg-teal-50 text-teal-900'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      Stored features · editable
                    </h3>

                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Inputs are prefilled from the latest stored city
                      observation. Edit a value to test an override;
                      unchanged values use the saved baseline.
                    </p>

                    {featureDefaultsQuery.data && (
                      <p className="mt-1 text-[10px] leading-4 text-teal-800">
                        Observation date:{' '}
                        {featureDefaultsQuery.data.observationDate}
                        {' · Source: '}
                        {featureDefaultsQuery.data.source ===
                        'historical_database_and_training_dataset'
                          ? 'database + matching training dataset for missing fields'
                          : featureDefaultsQuery.data.source === 'mock'
                            ? 'mock preview data'
                            : 'database'}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={restoreStoredValues}
                    disabled={
                      !featureDefaultsQuery.data ||
                      predictionMutation.isPending
                    }
                    className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Restore stored
                  </button>
                </div>

                {featureDefaultsQuery.isLoading && (
                  <p className="rounded border border-sky-200 bg-sky-50 p-2 text-[11px] text-sky-800">
                    Loading stored feature values for {formCity}…
                  </p>
                )}

                {featureDefaultsQuery.error && (
                  <p className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] leading-4 text-amber-900">
                    Stored values could not be loaded:{' '}
                    {getApiErrorMessage(featureDefaultsQuery.error)} You
                    can enter an override manually, but verify the city
                    has sufficient historical data.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="override-pm25" className="mb-1 block text-[11px] font-medium text-slate-600">
                      PM2.5 (µg/m³)
                    </label>
                    <input id="override-pm25" type="number" min="0" max="1000" step="any" placeholder="Stored value" {...register('pm25', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.pm25 && <p className="mt-1 text-[10px] text-red-600">{errors.pm25.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="override-pm10" className="mb-1 block text-[11px] font-medium text-slate-600">
                      PM10 (µg/m³)
                    </label>
                    <input id="override-pm10" type="number" min="0" max="1500" step="any" placeholder="Stored value" {...register('pm10', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.pm10 && <p className="mt-1 text-[10px] text-red-600">{errors.pm10.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="override-no2" className="mb-1 block text-[11px] font-medium text-slate-600">
                      NO₂ (µg/m³)
                    </label>
                    <input id="override-no2" type="number" min="0" max="500" step="any" placeholder="Stored value" {...register('no2', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.no2 && <p className="mt-1 text-[10px] text-red-600">{errors.no2.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="override-so2" className="mb-1 block text-[11px] font-medium text-slate-600">
                      SO₂ (µg/m³)
                    </label>
                    <input id="override-so2" type="number" min="0" max="500" step="any" placeholder="Stored value" {...register('so2', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.so2 && <p className="mt-1 text-[10px] text-red-600">{errors.so2.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="override-co" className="mb-1 block text-[11px] font-medium text-slate-600">
                      CO (mg/m³)
                    </label>
                    <input id="override-co" type="number" min="0" max="100" step="any" placeholder="Stored value" {...register('co', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.co && <p className="mt-1 text-[10px] text-red-600">{errors.co.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="override-o3" className="mb-1 block text-[11px] font-medium text-slate-600">
                      O₃ (µg/m³)
                    </label>
                    <input id="override-o3" type="number" min="0" max="500" step="any" placeholder="Stored value" {...register('o3', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.o3 && <p className="mt-1 text-[10px] text-red-600">{errors.o3.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="override-temperature" className="mb-1 block text-[11px] font-medium text-slate-600">
                      Temperature (°C)
                    </label>
                    <input id="override-temperature" type="number" min="-20" max="60" step="any" placeholder="Stored value" {...register('temperature', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.temperature && <p className="mt-1 text-[10px] text-red-600">{errors.temperature.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="override-humidity" className="mb-1 block text-[11px] font-medium text-slate-600">
                      Humidity (%)
                    </label>
                    <input id="override-humidity" type="number" min="0" max="100" step="any" placeholder="Stored value" {...register('humidity', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.humidity && <p className="mt-1 text-[10px] text-red-600">{errors.humidity.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="override-wind" className="mb-1 block text-[11px] font-medium text-slate-600">
                      Wind speed (km/h)
                    </label>
                    <input id="override-wind" type="number" min="0" max="150" step="any" placeholder="Stored value" {...register('windSpeed', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.windSpeed && <p className="mt-1 text-[10px] text-red-600">{errors.windSpeed.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="override-rainfall" className="mb-1 block text-[11px] font-medium text-slate-600">
                      Rainfall (mm)
                    </label>
                    <input id="override-rainfall" type="number" min="0" max="500" step="any" placeholder="Stored value" {...register('rainfall', { setValueAs: (value) => value === '' ? undefined : Number(value) })} className="w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs" />
                    {errors.rainfall && <p className="mt-1 text-[10px] text-red-600">{errors.rainfall.message}</p>}
                  </div>
                </div>
              </section>
            )}

            <button
              type="submit"
              disabled={
                predictionMutation.isPending ||
                citiesLoading ||
                cityList.length === 0 ||
                Boolean(citiesError)
              }
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
                  Predict {selectedHorizon === 'next_3_days' ? '3-day-ahead' : 'next-day'} AQI
                </>
              )}
            </button>
          </form>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-4 text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <p>
              Automatic mode uses the stored data for the selected city.
              Advanced mode changes only the inputs you enter. Neither
              mode fetches live pollution measurements.
            </p>
          </div>
        </section>

        <section className="space-y-5 lg:col-span-7" aria-live="polite">
          {predictionMutation.isPending && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <LoadingState
                message={`Running the trained ${selectedHorizonLabel} AQI model...`}
              />
            </div>
          )}

          {predictionMutation.error && !predictionMutation.isPending && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h2 className="text-sm font-bold">
                  Prediction could not be generated
                </h2>
                <p className="mt-1 text-xs leading-5">
                  {getApiErrorMessage(predictionMutation.error)}
                </p>
              </div>
            </div>
          )}

          {!result &&
            !predictionMutation.isPending &&
            !predictionMutation.error && (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <Brain className="h-9 w-9 text-teal-700" />
                <h2 className="mt-3 text-base font-bold text-slate-900">
                  Ready to predict
                </h2>
                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                  Select a city, prediction horizon, and input strategy,
                  then run the model. Results will appear here after the
                  API returns a successful prediction.
                </p>
              </div>
            )}

          {result && !predictionMutation.isPending && (
            <>
              <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {result.city} {resultHorizonLabel} AQI prediction
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Generated {formatTime(result.predictionTimestamp)}
                      {forecastDate
                        ? ` · Target date: ${formatDate(forecastDate)}`
                        : ''}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-500">
                      Model: {modelName || 'Model name not supplied'}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getCategoryClasses(result.category)}`}
                  >
                    {result.category}
                  </span>
                </div>

                {result.horizon === 'next_3_days' && (
                  <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900">
                    This is one prediction for the target date three days
                    ahead, not a separate forecast for each intervening
                    day.
                  </div>
                )}

                {isDemoResult && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    This response is marked as demonstration output by
                    the API. Check that the frontend is in API mode and
                    the backend is configured for the trained model.
                  </div>
                )}

                <div className="my-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Reference AQI
                    </p>
                    <p className="mt-1 font-mono text-3xl font-extrabold text-slate-800">
                      {Number.isFinite(result.referenceAqi)
                        ? result.referenceAqi.toFixed(1)
                        : 'N/A'}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Baseline derived from stored data or supplied model
                      inputs.
                    </p>
                  </div>

                  <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800">
                      Predicted AQI
                    </p>
                    <p className="mt-1 font-mono text-4xl font-black text-teal-800">
                      {Number.isFinite(result.predictedAqi)
                        ? result.predictedAqi.toFixed(2)
                        : 'N/A'}
                    </p>

                    {result.confidenceInterval && (
                      <p className="mt-1 text-[11px] text-teal-800">
                        Prediction interval:{' '}
                        {result.confidenceInterval.lower.toFixed(1)}
                        {'–'}
                        {result.confidenceInterval.upper.toFixed(1)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <div className="flex min-w-28 flex-1 flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Predicted trend
                    </span>
                    <TrendBadge trend={result.trend} size="sm" />
                  </div>

                  <div className="flex min-w-28 flex-1 flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Risk assessment
                    </span>
                    <RiskBadge level={result.riskLevel} size="sm" />
                  </div>

                  <div className="flex min-w-28 flex-1 flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Model status
                    </span>
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
                    {result.explanation ||
                      'The API did not return an explanation for this prediction.'}
                  </p>
                </div>

                {result.featureDrivers &&
                result.featureDrivers.length > 0 ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <h3 className="mb-2 text-xs font-bold text-slate-800">
                      Feature attribution
                    </h3>

                    <div className="space-y-2">
                      {result.featureDrivers.map((driver, index) => (
                        <div
                          key={`${driver.feature}-${index}`}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="text-slate-600">
                            {driver.feature}
                          </span>
                          <span className="font-mono text-slate-700">
                            {Math.round(driver.weight * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-[11px] leading-4 text-slate-500">
                    Feature attribution and calibrated prediction
                    intervals are not currently supplied by the backend
                    model response.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600">
                <p className="font-semibold text-slate-800">
                  Interpreting this result
                </p>
                <p className="mt-1">
                  This is a model-generated estimate for the target date,
                  not a direct measurement. Accuracy depends on the
                  availability and quality of the historical AQI,
                  pollutant, weather, and time-series features used for
                  inference.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
