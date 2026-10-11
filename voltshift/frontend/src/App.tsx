/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useGridSocket } from './hooks/useGridSocket';
import { MetricsBar } from './components/MetricsBar';
import { ControlBar } from './components/ControlBar';
import { HomePage } from './pages/HomePage';
import { GridMapPage } from './pages/GridMapPage';
import { WorkloadsPage } from './pages/WorkloadsPage';
import { AIAuditPage } from './pages/AIAuditPage';
import { IsoAnalyticsPage } from './pages/IsoAnalyticsPage';
import { VoltShiftLogo } from './components/VoltShiftLogo';
import {
  Home,
  Map,
  Server,
  BrainCircuit,
  Activity,
  Database,
  ShieldCheck,
  Sun,
  ExternalLink,
  X,
  Zap,
} from 'lucide-react';

type TabPage = 'HOME' | 'MAP' | 'WORKLOADS' | 'AI_AUDIT' | 'ISO_ANALYTICS';

export default function App() {
  const {
    data,
    setHour,
    toggleAutonomousMode,
    triggerPeakerSpike,
    resetMetrics,
  } = useGridSocket();

  const [activeTab, setActiveTab] = useState<TabPage>('HOME');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [showSourcesModal, setShowSourcesModal] = useState(false);

  const handleSelectSiteAndInspect = (siteId: string | null) => {
    setSelectedSiteId(siteId);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Header & Navigation Tabs */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('HOME')}
            className="flex items-center text-left group cursor-pointer focus:outline-none"
            title="VoltShift Home"
          >
            <VoltShiftLogo size="md" />
          </button>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('HOME')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'HOME'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Home className="h-3.5 w-3.5 text-emerald-400" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MAP')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'MAP'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Map className="h-3.5 w-3.5 text-emerald-400" />
              <span>3D Grid Map</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('WORKLOADS')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'WORKLOADS'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Server className="h-3.5 w-3.5 text-cyan-400" />
              <span>Industrial Sites</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 text-zinc-400">
                {data.workloads.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('AI_AUDIT')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'AI_AUDIT'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BrainCircuit className="h-3.5 w-3.5 text-purple-400" />
              <span>Gemini AI Audit</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ISO_ANALYTICS')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
                activeTab === 'ISO_ANALYTICS'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-amber-400" />
              <span>Regional ISOs</span>
            </button>
          </nav>
        </div>

        {/* Operational Status Tag (4/4 Live API badge removed; AUTONOMOUS hidden on homepage) */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {data.is_peaker_event && (
            <div className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
              <span>PEAKER SHOCK ACTIVE</span>
            </div>
          )}
          {activeTab !== 'HOME' && (
            <div
              className={`px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                data.is_autonomous_mode
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  data.is_autonomous_mode ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                }`}
              />
              <span>{data.is_autonomous_mode ? 'AUTONOMOUS' : 'UNMANAGED'}</span>
            </div>
          )}
        </div>
      </header>

      {/* Top Real-Time KPI Ribbon (Hidden on Home Page) */}
      {activeTab !== 'HOME' && (
        <MetricsBar
          metrics={data.cumulative_metrics}
          isAutonomous={data.is_autonomous_mode}
          isPeaker={data.is_peaker_event}
        />
      )}

      {/* Main Page View Area - Full-Sized and Uncluttered */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'HOME' && (
          <HomePage
            zones={data.zones}
            workloads={data.workloads}
            metrics={data.cumulative_metrics}
            isAutonomous={data.is_autonomous_mode}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenSourcesModal={() => setShowSourcesModal(true)}
          />
        )}

        {activeTab === 'MAP' && (
          <GridMapPage
            zones={data.zones}
            workloads={data.workloads}
            selectedSiteId={selectedSiteId}
            onSelectSite={handleSelectSiteAndInspect}
            isAutonomous={data.is_autonomous_mode}
            explanation={data.ai_explanation}
            simHour={data.sim_hour}
            onSelectHour={setHour}
            isPeaker={data.is_peaker_event}
            onToggleAutonomous={toggleAutonomousMode}
            onTriggerPeaker={triggerPeakerSpike}
          />
        )}

        {activeTab === 'WORKLOADS' && (
          <WorkloadsPage
            workloads={data.workloads}
            zones={data.zones}
            isAutonomous={data.is_autonomous_mode}
            onSelectSite={(id) => {
              handleSelectSiteAndInspect(id);
              setActiveTab('MAP');
            }}
          />
        )}

        {activeTab === 'AI_AUDIT' && (
          <AIAuditPage
            explanation={data.ai_explanation}
            simHour={data.sim_hour}
            onSelectHour={setHour}
            isPeaker={data.is_peaker_event}
            isAutonomous={data.is_autonomous_mode}
            zones={data.zones}
            workloads={data.workloads}
            onToggleAutonomous={toggleAutonomousMode}
            onTriggerPeaker={triggerPeakerSpike}
          />
        )}

        {activeTab === 'ISO_ANALYTICS' && (
          <IsoAnalyticsPage
            zones={data.zones}
            workloads={data.workloads}
            simHour={data.sim_hour}
            onSelectSite={(id) => {
              handleSelectSiteAndInspect(id);
              setActiveTab('MAP');
            }}
          />
        )}
      </main>

      {/* Bottom Scenario & Disruption Control Bar (Hidden on Home Page) */}
      {activeTab !== 'HOME' && (
        <ControlBar
          simHour={data.sim_hour}
          isAutonomous={data.is_autonomous_mode}
          isPeaker={data.is_peaker_event}
          onSetHour={setHour}
          onToggleAutonomous={toggleAutonomousMode}
          onTriggerPeaker={triggerPeakerSpike}
          onReset={resetMetrics}
        />
      )}

      {/* Real Data Sources Transparency Modal */}
      {showSourcesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-emerald-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 text-zinc-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    Live Real-Time Federal & Global Data Sources
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    100% real government and global APIs powering VoltShift telemetry
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSourcesModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sources List */}
            <div className="flex flex-col gap-3 font-sans">
              {/* 1. US EIA */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-blue-500/30 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="font-bold text-sm text-zinc-100">
                      US Energy Information Administration (EIA v2)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 border border-blue-500/30 text-blue-300 font-semibold">
                    CONNECTED & STREAMING
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Official federal hourly Form 930 electric balancing authority data. Provides verified generation megawatt outputs by fuel type (Solar, Wind, Nuclear, Hydro, Gas, Coal, Geothermal) for CAISO, ERCOT, PJM, and MISO.
                </p>
                <div className="text-[11px] font-mono text-zinc-500">
                  Endpoint: <span className="text-zinc-300">api.eia.gov/v2/electricity/rto/fuel-type-data/</span>
                </div>
              </div>

              {/* 2. NREL */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-amber-500/30 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="font-bold text-sm text-zinc-100">
                      National Renewable Energy Laboratory (NREL / NLR)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                    CONNECTED & READY
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Provides high-resolution Solar Resource data (Global Horizontal Irradiance GHI and Direct Normal Irradiance DNI in kWh/m²/day) for facility GPS coordinates, plus Alternative Clean Fuel and EV charging infrastructure locations.
                </p>
                <div className="text-[11px] font-mono text-zinc-500">
                  Endpoint: <span className="text-zinc-300">developer.nlr.gov/api/solar/solar_resource/v1.json</span>
                </div>
              </div>

              {/* 3. Electricity Maps */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-emerald-500/30 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-sm text-zinc-100">
                      Electricity Maps Live API v3
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold">
                    STREAMING (EVERY 3 MIN)
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Real-time regional carbon intensity (gCO₂/kWh) and power consumption breakdown for US-CAL-CISO, US-TEX-ERCO, US-MIDA-PJM, and US-MIDW-MISO.
                </p>
                <div className="text-[11px] font-mono text-zinc-500">
                  Endpoint: <span className="text-zinc-300">api.electricitymap.org/v3/carbon-intensity/latest</span>
                </div>
              </div>

              {/* 4. Google Gemini GenAI */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-purple-500/30 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse" />
                    <span className="font-bold text-sm text-zinc-100">
                      Google Gemini 3.8 Flash GenAI
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 border border-purple-500/30 text-purple-300 font-semibold">
                    ACTIVE MODEL
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Analyzes live grid telemetry, carbon marginality, peaker plant operations, and job deadlines to optimize multi-megawatt industrial workload shifts autonomously.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSourcesModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
