import React, { useState } from 'react';
import { IndustrialWorkload, WorkloadType, ActionStatus } from '../types';
import { Server, Truck, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

interface WorkloadListProps {
  workloads: IndustrialWorkload[];
  selectedSiteId: string | null;
  onSelectSite: (id: string | null) => void;
  isAutonomous: boolean;
}

export const WorkloadList: React.FC<WorkloadListProps> = ({
  workloads,
  selectedSiteId,
  onSelectSite,
  isAutonomous,
}) => {
  const [filter, setFilter] = useState<'ALL' | WorkloadType>('ALL');

  const filtered = workloads.filter((w) => {
    if (filter === 'ALL') return true;
    return w.type === filter;
  });

  const getStatusStyle = (status: ActionStatus) => {
    switch (status) {
      case 'BOOST':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'THROTTLE':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'DEFER':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'MAINTAIN':
      default:
        return 'text-zinc-400 bg-zinc-800/40 border-zinc-700/60';
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/90 border-r border-zinc-800/80 font-sans">
      {/* Header & Filter Controls */}
      <div className="p-4 border-b border-zinc-800/80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
              Industrial Workloads
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Active distributed AI clusters & commercial EV depots
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-500">{filtered.length} Sites</span>
        </div>

        {/* Filter Segmented Buttons */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`flex-1 py-1 rounded font-medium transition-colors ${
              filter === 'ALL'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Sites
          </button>
          <button
            type="button"
            onClick={() => setFilter('AI_TRAINING')}
            className={`flex-1 py-1 rounded font-medium transition-colors flex items-center justify-center gap-1 ${
              filter === 'AI_TRAINING'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Server className="h-3 w-3 text-cyan-400" />
            <span>AI Clusters</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('EV_FLEET')}
            className={`flex-1 py-1 rounded font-medium transition-colors flex items-center justify-center gap-1 ${
              filter === 'EV_FLEET'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Truck className="h-3 w-3 text-emerald-400" />
            <span>EV Fleets</span>
          </button>
        </div>
      </div>

      {/* Facility Cards List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {filtered.map((w) => {
          const isSelected = selectedSiteId === w.id;
          const powerPct = Math.round((w.current_kw / w.max_kw) * 100);

          return (
            <div
              key={w.id}
              onClick={() => onSelectSite(isSelected ? null : w.id)}
              className={`p-3 rounded-lg border transition-all cursor-pointer text-xs ${
                isSelected
                  ? 'bg-zinc-900 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/30'
                  : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-900/90 hover:border-zinc-700'
              }`}
            >
              {/* Site Name and Region */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-7 w-7 rounded-md flex items-center justify-center ${
                      w.type === 'AI_TRAINING'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {w.type === 'AI_TRAINING' ? (
                      <Server className="h-3.5 w-3.5" />
                    ) : (
                      <Truck className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-100 text-xs leading-snug">
                      {w.site_name}
                    </div>
                    <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-zinc-400">{w.zone_id}</span>
                      <span>·</span>
                      <span>Flex: {(w.flexibility_score * 100).toFixed(0)}%</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5 text-zinc-400">
                        <Clock className="h-3 w-3" />
                        <span>SLA {w.deadline_hour}:00</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${getStatusStyle(
                    w.status
                  )}`}
                >
                  {w.status}
                </div>
              </div>

              {/* Power Metrics & Visual Bar */}
              <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-800/60 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Dispatched Draw</span>
                  <div className="font-mono font-medium text-zinc-200">
                    <span>{w.current_kw.toLocaleString()} kW</span>
                    <span className="text-zinc-500 text-[10px] ml-1">/ {w.max_kw.toLocaleString()} kW</span>
                  </div>
                </div>

                {/* Power Bar */}
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      w.status === 'BOOST'
                        ? 'bg-emerald-500'
                        : w.status === 'THROTTLE'
                        ? 'bg-amber-500'
                        : w.status === 'DEFER'
                        ? 'bg-rose-500'
                        : 'bg-zinc-400'
                    }`}
                    style={{ width: `${Math.min(100, powerPct)}%` }}
                  />
                </div>

                {/* Shift Delta vs Baseline */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">
                    Baseline: {w.baseline_kw} kW
                  </span>
                  <span
                    className={`font-mono font-semibold ${
                      w.delta_kw > 0
                        ? 'text-emerald-400'
                        : w.delta_kw < 0
                        ? 'text-amber-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {isAutonomous
                      ? w.delta_kw > 0
                        ? `+${w.delta_kw} kW (Boosted)`
                        : w.delta_kw < 0
                        ? `${w.delta_kw} kW (Shifted)`
                        : 'Flat Schedule'
                      : 'Unmanaged 0 kW Delta'}
                  </span>
                </div>
              </div>

              {/* SLA Quota Progress */}
              <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Daily Quota Met:</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${w.sla_progress_pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-zinc-200 text-xs font-semibold">
                    {w.sla_progress_pct}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
