import React from 'react';
import {
  GridZone,
  IndustrialWorkload,
  CumulativeMetrics,
} from '../types';
import {
  Map,
  Server,
  BrainCircuit,
  Activity,
  Zap,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  DollarSign,
  Leaf,
  Globe2,
  CheckCircle2,
  Cpu,
  Truck,
  Sparkles,
  Info,
} from 'lucide-react';
import { VoltShiftLogo } from '../components/VoltShiftLogo';

interface HomePageProps {
  zones: GridZone[];
  workloads: IndustrialWorkload[];
  metrics?: CumulativeMetrics;
  isAutonomous: boolean;
  onNavigateTab: (tab: 'MAP' | 'WORKLOADS' | 'AI_AUDIT' | 'ISO_ANALYTICS') => void;
  onOpenSourcesModal: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  zones,
  workloads,
  isAutonomous,
  onNavigateTab,
  onOpenSourcesModal,
}) => {
  const totalCapacityMw = (
    workloads.reduce((acc, w) => acc + w.max_kw, 0) / 1000
  ).toFixed(1);

  const totalCurrentMw = (
    workloads.reduce((acc, w) => acc + w.current_kw, 0) / 1000
  ).toFixed(1);

  const aiSitesCount = workloads.filter((w) => w.type === 'AI_TRAINING').length;
  const evSitesCount = workloads.filter((w) => w.type === 'EV_FLEET').length;

  return (
    <div className="w-full h-full overflow-y-auto bg-zinc-950 p-6 md:p-8 font-sans scroll-smooth">
      <div className="max-w-7xl mx-auto flex flex-col gap-10 pb-16">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-900/40 to-zinc-950 p-8 md:p-12 shadow-2xl">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="max-w-3xl space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <VoltShiftLogo size="lg" />
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Real-Time Grid Intelligence
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-100 font-sans leading-tight">
                Decarbonize High-Demand Compute & Fleets with Instant Grid Intelligence.
              </h1>

              <p className="text-zinc-300 text-sm md:text-base leading-relaxed">
                VoltShift monitors transmission grid stress, carbon intensity, and power pricing across{' '}
                <span className="text-emerald-400 font-semibold">CAISO</span>,{' '}
                <span className="text-sky-400 font-semibold">ERCOT</span>,{' '}
                <span className="text-purple-400 font-semibold">PJM</span>, and{' '}
                <span className="text-orange-400 font-semibold">MISO</span>. 
                It automatically throttles and shifts flexible megawatt workloads—such as AI training jobs and EV commercial fleets—to keep power bills low, protect SLAs, and slash carbon emissions.
              </p>

              {/* Quick Launch Action CTAs */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateTab('MAP')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs md:text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 group cursor-pointer"
                >
                  <Map className="w-4 h-4 text-zinc-950" />
                  <span>Launch 3D Grid Map</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('AI_AUDIT')}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium text-xs md:text-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <BrainCircuit className="w-4 h-4 text-purple-400" />
                  <span>Inspect Gemini AI Audit</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('WORKLOADS')}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium text-xs md:text-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>View Industrial Sites</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenSourcesModal}
                  className="px-3.5 py-2.5 rounded-xl bg-zinc-950/60 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 font-mono text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Live Data APIs</span>
                </button>
              </div>
            </div>

            {/* Quick Overview Badge Card */}
            <div className="w-full md:w-80 shrink-0 bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-5 space-y-4 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-xs font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Fleet Overview
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  MONITORED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                  <span className="text-zinc-500 text-[10px] uppercase font-mono block">Covered Grids</span>
                  <span className="text-emerald-400 font-bold font-mono text-base">
                    {zones.length} ISOs
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                  <span className="text-zinc-500 text-[10px] uppercase font-mono block">Managed Sites</span>
                  <span className="text-cyan-400 font-bold font-mono text-base">
                    {workloads.length} Facilities
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                  <span className="text-zinc-500 text-[10px] uppercase font-mono block">Total Capacity</span>
                  <span className="text-zinc-200 font-bold font-mono text-base">
                    {totalCapacityMw} MW
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                  <span className="text-zinc-500 text-[10px] uppercase font-mono block">Active Load</span>
                  <span className="text-amber-400 font-bold font-mono text-base">
                    {totalCurrentMw} MW
                  </span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/60">
                <span>Facility Types:</span>
                <span className="font-mono text-zinc-200 font-semibold">
                  {aiSitesCount} AI Clusters, {evSitesCount} EV Depots
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: What You Can Do With This App */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 border-b border-zinc-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Core Capabilities
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans mt-1">
                What You Can Do With VoltShift
              </h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-xl">
              VoltShift provides an end-to-end mission control center for energy operations, sustainability engineers, and industrial data center managers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Capability 1: 3D Grid Map */}
            <div className="flex flex-col justify-between p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/40 transition-all hover:bg-zinc-900/90 group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Map className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-zinc-100 font-sans">
                  1. Explore 3D Multi-ISO Grids
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Fly through interactive 3D map views of California (CAISO), Texas (ERCOT), Mid-Atlantic (PJM), and Midwest (MISO). Toggle between signature regional colors and real-time carbon intensity tiers.
                </p>
                <ul className="text-[11px] text-zinc-400 space-y-1.5 pt-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Dynamic transmission flow animations</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Satellite, dark & wireframe basemaps</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Click any industrial site for live stats</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('MAP')}
                className="mt-6 w-full py-2 px-3 rounded-lg bg-zinc-800/80 hover:bg-emerald-500 hover:text-zinc-950 text-xs font-semibold text-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Open 3D Grid Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Capability 2: Industrial Workloads */}
            <div className="flex flex-col justify-between p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-cyan-500/40 transition-all hover:bg-zinc-900/90 group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-zinc-100 font-sans">
                  2. Manage Flexible Industrial Sites
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Monitor individual AI datacenter clusters and commercial electric truck fleet hubs. Inspect operational constraints, active power draw, baseline comparisons, and SLA progress.
                </p>
                <ul className="text-[11px] text-zinc-400 space-y-1.5 pt-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>AI training checkpoint batch pacing</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>EV depot pre-departure charge guarantees</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Real-time MW dispatch and SLA guardrails</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('WORKLOADS')}
                className="mt-6 w-full py-2 px-3 rounded-lg bg-zinc-800/80 hover:bg-cyan-500 hover:text-zinc-950 text-xs font-semibold text-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View Industrial Sites</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Capability 3: Gemini AI Audit */}
            <div className="flex flex-col justify-between p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-purple-500/40 transition-all hover:bg-zinc-900/90 group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-zinc-100 font-sans">
                  3. Audit AI Dispatch Decisions
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Access transparent, auditable rationales generated by Google Gemini. See exactly why load was shifted, which marginal peaker emissions were avoided, and monetary economics.
                </p>
                <ul className="text-[11px] text-zinc-400 space-y-1.5 pt-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>Chain-of-thought dispatch reasoning</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>Avoided peaker plant telemetry</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>Baseline vs Autonomous delta metrics</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('AI_AUDIT')}
                className="mt-6 w-full py-2 px-3 rounded-lg bg-zinc-800/80 hover:bg-purple-500 hover:text-zinc-950 text-xs font-semibold text-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Inspect AI Audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Capability 4: ISO Analytics */}
            <div className="flex flex-col justify-between p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/40 transition-all hover:bg-zinc-900/90 group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-zinc-100 font-sans">
                  4. Track Regional Power Markets
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Dive into regional fuel mixes across solar, wind, hydro, nuclear, gas, and coal. Track Locational Marginal Pricing ($/MWh) and marginal carbon intensity (gCO₂/kWh).
                </p>
                <ul className="text-[11px] text-zinc-400 space-y-1.5 pt-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Fuel generation mix percentages</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Locational Marginal Price (LMP) trends</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Hourly solar and wind ramping curves</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('ISO_ANALYTICS')}
                className="mt-6 w-full py-2 px-3 rounded-lg bg-zinc-800/80 hover:bg-amber-500 hover:text-zinc-950 text-xs font-semibold text-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View ISO Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Section: Covered Regional Grids (ISO Map Legend Preview) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div>
              <h3 className="text-lg font-bold text-zinc-100 font-sans">
                Covered Independent System Operators (ISOs)
              </h3>
              <p className="text-xs text-zinc-400">
                Four major interconnected transmission regions with unique geographic generation profiles
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('MAP')}
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View Map</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {zones.map((zone) => {
              const isCaiso = zone.zone_id === 'CAISO';
              const isErcot = zone.zone_id === 'ERCOT';
              const isPjm = zone.zone_id === 'PJM';

              const badgeBorder = isCaiso
                ? 'border-emerald-500/30'
                : isErcot
                ? 'border-sky-500/30'
                : isPjm
                ? 'border-purple-500/30'
                : 'border-orange-500/30';

              const dotColor = isCaiso
                ? 'bg-emerald-400'
                : isErcot
                ? 'bg-sky-400'
                : isPjm
                ? 'bg-purple-400'
                : 'bg-orange-400';

              const cleanGenerationMw = Math.round(zone.solar_mw + zone.wind_mw);

              return (
                <div
                  key={zone.zone_id}
                  className={`p-4 rounded-xl bg-zinc-900/60 border ${badgeBorder} flex flex-col justify-between gap-3`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 font-mono font-bold text-sm text-zinc-100">
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                        {zone.zone_id}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                        {zone.renewable_pct}% Clean
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400 block font-medium">
                      {zone.name}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Carbon:</span>
                      <span className="text-zinc-200 font-semibold">{zone.carbon_intensity} gCO₂/kWh</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Solar + Wind:</span>
                      <span className="text-zinc-200 font-semibold">{cleanGenerationMw.toLocaleString()} MW</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Marginal Fuel:</span>
                      <span className="text-zinc-200 font-semibold">{zone.marginal_fuel || 'Natural Gas'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Live Federal and Global Data Transparency */}
        <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <Globe2 className="w-4 h-4" /> Real-Time Federal & International Grounding
            </div>
            <h4 className="text-base font-bold text-zinc-100 font-sans">
              Powered by Live Energy APIs & Advanced Models
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              VoltShift links to official U.S. Energy Information Administration (EIA v2), National Renewable Energy Laboratory (NREL), Electricity Maps marginal carbon intensity, and Google Gemini reasoning.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenSourcesModal}
            className="px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium border border-zinc-700 transition-colors shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <Info className="w-4 h-4 text-emerald-400" />
            <span>View Data Source Endpoints</span>
          </button>
        </div>
      </div>
    </div>
  );
};
