import React from 'react';
import { CumulativeMetrics } from '../types';
import { Leaf, Zap, DollarSign, TrendingUp, Gauge, ShieldCheck } from 'lucide-react';

interface MetricsBarProps {
  metrics: CumulativeMetrics;
  isAutonomous: boolean;
  isPeaker: boolean;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  metrics,
  isAutonomous,
}) => {
  return (
    <div className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-2xl px-6 py-2 font-sans select-none">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* KPI 1: CO2 Avoided */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Leaf className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-zinc-400 font-medium block leading-tight">CO₂ Avoided</span>
            <div className="text-xs font-semibold font-mono text-zinc-100 truncate">
              {metrics.co2_avoided_kg.toLocaleString(undefined, { minimumFractionDigits: 1 })}
              <span className="text-[10px] font-sans text-zinc-400 ml-1 font-normal">kg</span>
            </div>
            <span className="text-[10px] text-emerald-400/90 font-mono block leading-tight">+{metrics.improvement_pct}% vs baseline</span>
          </div>
        </div>

        {/* KPI 2: Clean Energy Shifted */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
          <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-zinc-400 font-medium block leading-tight">Renewable Shift</span>
            <div className="text-xs font-semibold font-mono text-zinc-100 truncate">
              {metrics.clean_energy_shifted_mwh.toFixed(2)}
              <span className="text-[10px] font-sans text-zinc-400 ml-1 font-normal">MWh</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono block leading-tight">Surplus Absorbed</span>
          </div>
        </div>

        {/* KPI 3: Peak Cost Savings */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
          <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <DollarSign className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-zinc-400 font-medium block leading-tight">Tariff Savings</span>
            <div className="text-xs font-semibold font-mono text-zinc-100 truncate">
              ${metrics.cost_savings_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono block leading-tight">Demand Charges Cut</span>
          </div>
        </div>

        {/* KPI 4: Managed Carbon Intensity */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Gauge className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-zinc-400 font-medium block leading-tight">Average Intensity</span>
            <div className="text-xs font-semibold font-mono text-emerald-300 truncate">
              {metrics.avg_carbon_managed}
              <span className="text-[10px] font-sans text-zinc-400 ml-1 font-normal">g/kWh</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono block leading-tight">Baseline: {metrics.avg_carbon_baseline}g</span>
          </div>
        </div>

        {/* KPI 5: Active Dispatched Load */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
          <div className="h-7 w-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 shrink-0">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-zinc-400 font-medium block leading-tight">Industrial Load</span>
            <div className="text-xs font-semibold font-mono text-zinc-100 truncate">
              {(metrics.total_active_kw / 1000).toFixed(2)}
              <span className="text-[10px] font-sans text-zinc-400 ml-1 font-normal">MW</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono block leading-tight">8 Monitored Sites</span>
          </div>
        </div>

        {/* KPI 6: Baseline Improvement */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-mono text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-emerald-400/90 font-medium block leading-tight">Net Abatement</span>
            <div className="text-xs font-semibold font-mono text-emerald-400 truncate">
              {isAutonomous ? `-${metrics.improvement_pct}%` : '0.0%'}
            </div>
            <span className="text-[10px] text-emerald-300/70 font-mono block leading-tight">Zero SLA Breaches</span>
          </div>
        </div>
      </div>
    </div>
  );
};
