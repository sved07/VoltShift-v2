import React from 'react';
import { GridZone, IndustrialWorkload } from '../types';
import { Zap, Sun, Wind, Flame, Activity, ShieldCheck, Database, Atom, Droplets } from 'lucide-react';

interface IsoAnalyticsPageProps {
  zones: GridZone[];
  workloads: IndustrialWorkload[];
  simHour: number;
  onSelectSite: (id: string) => void;
}

export const IsoAnalyticsPage: React.FC<IsoAnalyticsPageProps> = ({
  zones,
  workloads,
  simHour,
  onSelectSite,
}) => {
  return (
    <div className="w-full h-full overflow-y-auto bg-zinc-950 p-6 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-zinc-100 font-sans tracking-tight">
                  Regional ISO Grid Telemetry & Analytics
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                  EIA Form 930 Certified
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Official federal generation stacks (US EIA v2) combined with real-time carbon intensity (Electricity Maps)
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 font-mono text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Electricity Maps v3</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-950/40 border border-blue-500/30 text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span>US EIA Hourly Form 930</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 font-bold">
              {simHour.toString().padStart(2, '0')}:00
            </span>
          </div>
        </div>

        {/* 4 Regional ISO Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {zones.map((zone) => {
            const connectedWorkloads = workloads.filter((w) => w.zone_id === zone.zone_id);
            const totalZoneLoad = connectedWorkloads.reduce((sum, w) => sum + w.current_kw, 0);

            const carbonColor =
              zone.carbon_intensity < 150
                ? 'text-emerald-400'
                : zone.carbon_intensity <= 320
                ? 'text-amber-400'
                : 'text-rose-400';

            const eia = zone.eia_fuel_breakdown;

            return (
              <div
                key={zone.zone_id}
                className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between gap-5"
              >
                {/* Zone Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-zinc-500">Regional Balancing Authority</span>
                        {eia && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 font-semibold">
                            EIA Code: {eia.respondent}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-zinc-100">{zone.name}</h3>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200">
                      {zone.zone_id}
                    </span>
                  </div>

                  {/* Carbon Intensity & Renewable Share Header */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 mb-4 font-mono">
                    <div>
                      <span className="text-zinc-500 text-[10px] font-sans block">Carbon Intensity</span>
                      <span className={`text-xl font-bold ${carbonColor}`}>{zone.carbon_intensity}</span>
                      <span className="text-zinc-500 text-xs font-sans ml-1">gCO₂/kWh</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 text-[10px] font-sans block">Clean Generation Share</span>
                      <span className="text-xl font-bold text-zinc-100">
                        {eia?.clean_pct ? eia.clean_pct : zone.renewable_pct}%
                      </span>
                      <span className="text-zinc-500 text-xs font-sans ml-1">
                        {eia ? 'EIA Clean' : 'Renewable'}
                      </span>
                    </div>
                  </div>

                  {/* Official US EIA Generation Fuel Stack */}
                  {eia ? (
                    <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/80 mb-4">
                      <div className="flex items-center justify-between text-[11px] mb-2">
                        <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                          <Database className="h-3.5 w-3.5" />
                          <span>US EIA Real Generation by Fuel (Period: {eia.period})</span>
                        </div>
                        <span className="font-mono text-zinc-400 text-[10px]">
                          Total: {Math.round(eia.total_gen_mw).toLocaleString()} MW
                        </span>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                        <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex flex-col">
                          <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                            <Sun className="h-3 w-3 text-amber-400" /> Solar
                          </span>
                          <span className="font-bold text-zinc-100">{Math.round(eia.solar_mw).toLocaleString()} MW</span>
                        </div>

                        <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex flex-col">
                          <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                            <Wind className="h-3 w-3 text-cyan-400" /> Wind
                          </span>
                          <span className="font-bold text-zinc-100">{Math.round(eia.wind_mw).toLocaleString()} MW</span>
                        </div>

                        <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex flex-col">
                          <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                            <Atom className="h-3 w-3 text-purple-400" /> Nuclear
                          </span>
                          <span className="font-bold text-zinc-100">{Math.round(eia.nuclear_mw).toLocaleString()} MW</span>
                        </div>

                        <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex flex-col">
                          <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                            <Droplets className="h-3 w-3 text-blue-400" /> Hydro
                          </span>
                          <span className="font-bold text-zinc-100">{Math.round(eia.hydro_mw).toLocaleString()} MW</span>
                        </div>

                        <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex flex-col">
                          <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                            <Flame className="h-3 w-3 text-amber-500" /> Natural Gas
                          </span>
                          <span className="font-bold text-zinc-100">{Math.round(eia.gas_mw).toLocaleString()} MW</span>
                        </div>

                        <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex flex-col">
                          <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                            <Zap className="h-3 w-3 text-zinc-400" /> Coal
                          </span>
                          <span className="font-bold text-zinc-100">{Math.round(eia.coal_mw).toLocaleString()} MW</span>
                        </div>

                        {eia.geothermal_mw > 0 && (
                          <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex flex-col">
                            <span className="text-zinc-400 text-[10px]">Geothermal</span>
                            <span className="font-bold text-emerald-400">{Math.round(eia.geothermal_mw).toLocaleString()} MW</span>
                          </div>
                        )}

                        <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/60 flex flex-col">
                          <span className="text-zinc-400 text-[10px]">Clean Share</span>
                          <span className="font-bold text-emerald-400">{eia.clean_pct}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Fallback Generation Stack */
                    <div className="grid grid-cols-3 gap-2.5 font-mono text-xs mb-4">
                      <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-sans">
                          <Sun className="h-3.5 w-3.5 text-amber-400" />
                          <span>Solar Gen</span>
                        </div>
                        <span className="font-bold text-zinc-100">{zone.solar_mw.toLocaleString()} MW</span>
                      </div>

                      <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-sans">
                          <Wind className="h-3.5 w-3.5 text-cyan-400" />
                          <span>Wind Gen</span>
                        </div>
                        <span className="font-bold text-zinc-100">{zone.wind_mw.toLocaleString()} MW</span>
                      </div>

                      <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-sans">
                          <Flame className="h-3.5 w-3.5 text-rose-400" />
                          <span>Marginal Fuel</span>
                        </div>
                        <span className="font-bold text-zinc-300 text-[11px] truncate" title={zone.marginal_fuel}>
                          {zone.marginal_fuel}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Connected Workloads Mini-List */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Interconnected Facilities ({connectedWorkloads.length})</span>
                      <span className="font-mono text-zinc-300 font-semibold">{totalZoneLoad.toLocaleString()} kW active</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {connectedWorkloads.map((w) => (
                        <div
                          key={w.id}
                          onClick={() => onSelectSite(w.id)}
                          className="p-2 rounded bg-zinc-950/40 border border-zinc-800/60 hover:border-zinc-700 flex items-center justify-between text-xs cursor-pointer transition-colors"
                        >
                          <span className="text-zinc-200 truncate max-w-[200px]">{w.site_name}</span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-zinc-400">{w.current_kw} kW</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                w.status === 'BOOST'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : w.status === 'THROTTLE'
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : w.status === 'DEFER'
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {w.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
