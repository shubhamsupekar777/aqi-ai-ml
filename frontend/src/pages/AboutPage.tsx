import React from 'react';
import {
  Brain,
  Layers,
  TrendingUp,
  ShieldAlert,
  Database,
  Cpu,
  Sparkles,
  Bot,
  ExternalLink,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { DemoBadge } from '../components/common/DemoBadge';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            About AQI AI — Environmental Intelligence Platform
          </h1>
          <DemoBadge variant="subtle" />
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Architectural specification, algorithmic roadmap, and implementation phases
        </p>
      </div>

      {/* Overview Manifesto */}
      <div className="p-6 bg-white rounded-xl border border-slate-200/90 shadow-xs space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <h2 className="text-base font-bold text-slate-900">Platform Objective</h2>
        <p>
          <strong>AQI AI</strong> is an environmental intelligence SaaS platform built to transition ambient air quality monitoring from
          <strong> reactive observation</strong> to <strong>proactive forecasting</strong>.
          Traditional platforms report lagging historical index readings; AQI AI integrates numerical regression forecasting, regulatory tier classification, trajectory slope modeling, and demographic exposure alerts into a unified, high-performance interface.
        </p>
      </div>

      {/* Four Core Features Delivered in Phase 1 */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-4">
          Four Core Intelligence Deliverables (Phase 1 Implemented)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-2">
              <Brain className="w-4 h-4 text-teal-700" />
              <span>1. AQI Numerical Prediction (Regression)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Provides continuous future-horizon numerical AQI predictions (+24h, +3d, +7d) derived from multi-tracer chemical concentrations and exogenous meteorological features. Includes feature driver attribution and uncertainty intervals.
            </p>
          </div>

          <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-2">
              <Layers className="w-4 h-4 text-teal-700" />
              <span>2. Air Quality Classification (Severity Tiers)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated deterministic mapping of particulate levels into standardized regulatory tiers (Good, Moderate, Unhealthy for Sensitive Groups, Unhealthy, Very Unhealthy, Hazardous) with explicit dual-standard support for US EPA and Indian CPCB NAQI.
            </p>
          </div>

          <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-2">
              <TrendingUp className="w-4 h-4 text-teal-700" />
              <span>3. Pollution Trend Prediction (Trajectory)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Velocity and slope classification analyzing whether atmospheric particulates are <strong>Increasing</strong>, <strong>Decreasing</strong>, or <strong>Stable</strong> across temporal horizons, with mathematical delta and percentage shift calculations.
            </p>
          </div>

          <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-2">
              <ShieldAlert className="w-4 h-4 text-teal-700" />
              <span>4. Pollution & Health Risk Classification</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Multi-tier exposure assessment categorizing ambient conditions into <strong>Low Risk</strong>, <strong>Moderate Risk</strong>, <strong>High Risk</strong>, and <strong>Severe Risk</strong>, accompanied by non-clinical public health recommendations and cohort-specific guidelines.
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Phase Architecture Roadmap */}
      <div className="p-6 bg-white rounded-xl border border-slate-200/90 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4">
          Implementation Roadmap & Academic Integrity Matrix
        </h3>

        <div className="space-y-4">
          {/* Phase 1 */}
          <div className="p-4 rounded-lg bg-teal-50/70 border border-teal-200">
            <div className="flex items-center justify-between font-bold text-xs text-teal-900 mb-1">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                <span>Phase 1 — Current Delivery (Complete Architecture)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-teal-200 text-teal-800 font-mono text-[10px]">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-teal-800/90">
              Full React frontend, FastAPI backend REST APIs, PostgreSQL / Alembic schema, centralized demo fixtures, CSV ingestion pipeline, ML inference contracts, and comprehensive unit tests.
            </p>
          </div>

          {/* Phase 2 */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between font-bold text-xs text-slate-800 mb-1">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Phase 2 — Machine Learning & Deep Learning (Scheduled Next)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                PLANNED
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Training Random Forest, XGBoost, and LightGBM regressors; fitting Stacking Ensembles; training PyTorch LSTM sequence-to-sequence deep forecasting models; persisting weights into `app/ml/models/`.
            </p>
          </div>

          {/* Phase 3 */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between font-bold text-xs text-slate-800 mb-1">
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-slate-500" />
                <span>Phase 3 — RAG Environmental Knowledge Copilot (Scheduled Later)</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                PLANNED
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Retrieval-Augmented Generation (RAG) assistant connected to official WHO, EPA, and CPCB scientific environmental reports, providing citation-backed answers to pollution and epidemiological queries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
