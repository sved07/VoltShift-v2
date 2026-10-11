import React from 'react';
import { GeminiAgentExplanation } from '../types';
import { Sparkles, BrainCircuit, ShieldAlert, Sun, Wind, ArrowRight } from 'lucide-react';

interface AIAuditPanelProps {
  explanation: GeminiAgentExplanation;
  simHour: number;
  onSelectHour: (h: number) => void;
  isPeaker: boolean;
  isAutonomous: boolean;
}

export const AIAuditPanel: React.FC<AIAuditPanelProps> = ({
  explanation,
  simHour,
  onSelectHour,
  isPeaker,
  isAutonomous,
}) => {
  const forecast = explanation.hourly_forecast || [];

  return (
    <div className="flex flex-col h-full bg-zinc-950/90 border-l border-zinc-800/80 font-sans text-xs">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span>Gemini Decision Audit</span>
              <Sparkles className="h-3 w-3 text-purple-400" />
            </h2>
            <p className="text-[11px] text-zinc-400">
              Autonomous reasoning & forward carbon arbitrage
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300">
          gemini-2.5-flash
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Real-Time Reasoning Card */}
        <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 flex flex-col gap-2.5">
          {/* Primary Driver */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">
              Primary Grid Catalyst
            </span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-300">
              {isPeaker ? (
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span>{explanation.primary_driver}</span>
            </div>
          </div>

          {/* Natural Language Explanation Prose */}
          <div className="text-zinc-200 text-xs leading-relaxed bg-zinc-950/60 p-3 rounded border border-zinc-800/60">
            "{explanation.reasoning_summary}"
          </div>

          {/* Forward Tactical Recommendation */}
          <div className="flex items-start gap-2 text-[11px] text-zinc-400 bg-purple-950/20 border border-purple-500/20 p-2.5 rounded">
            <ArrowRight className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-purple-300">Tactical Recommendation: </span>
              <span className="text-zinc-300">{explanation.forecast_recommendation}</span>
            </div>
          </div>

          {/* Estimated Carbon & Tariff Impacts */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 font-mono text-[11px]">
            <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800">
              <span className="text-zinc-400 block text-[10px] font-sans">Active Slice Abatement</span>
              <span className="text-emerald-400 font-bold text-sm">
                +{explanation.estimated_carbon_saved_kg} kg CO₂
              </span>
            </div>
            <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800">
              <span className="text-zinc-400 block text-[10px] font-sans">Arbitrage Savings</span>
              <span className="text-amber-400 font-bold text-sm">
                +${explanation.estimated_cost_saved_usd} USD
              </span>
            </div>
          </div>
        </div>

        {/* 24-Hour Carbon & Load Forecast Curve */}
        <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-zinc-200 text-xs font-mono uppercase tracking-wider">
                24-Hour Forward Carbon Curve
              </h3>
              <p className="text-[11px] text-zinc-400">
                Click any bar to preview regional dispatch actions
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Sun className="h-3 w-3 text-amber-400" /> Solar Crest
              </span>
              <span className="flex items-center gap-1">
                <Wind className="h-3 w-3 text-cyan-400" /> Wind Surge
              </span>
            </div>
          </div>

          {/* Interactive Hourly Bar Chart */}
          <div className="h-32 flex items-end gap-1 pt-4 pb-2 border-b border-zinc-800/80">
            {forecast.map((pt) => {
              const isCurrent = pt.hour === simHour;
              const heightPct = Math.min(100, Math.max(15, (pt.carbon_intensity / 420) * 100));
              const barColor =
                pt.recommended_action === 'BOOST'
                  ? 'bg-emerald-500'
                  : pt.recommended_action === 'THROTTLE'
                  ? 'bg-amber-500'
                  : pt.recommended_action === 'DEFER'
                  ? 'bg-rose-500'
                  : 'bg-zinc-600';

              return (
                <div
                  key={pt.hour}
                  onClick={() => onSelectHour(pt.hour)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  title={`Hour ${pt.hour}:00 - ${pt.carbon_intensity} gCO2/kWh (${pt.recommended_action})`}
                >
                  <div
                    className={`w-full rounded-t transition-all group-hover:opacity-100 ${barColor} ${
                      isCurrent ? 'ring-2 ring-zinc-100 opacity-100 scale-y-105' : 'opacity-70'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span
                    className={`text-[9px] font-mono mt-1 ${
                      isCurrent ? 'text-zinc-100 font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {pt.hour % 4 === 0 ? pt.hour : ''}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Forecast Key */}
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> BOOST (&lt;160g)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-zinc-400" /> MAINTAIN
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> THROTTLE
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> DEFER
            </span>
          </div>
        </div>

        {/* SLA & Carbon Arbitrage Policy Brief */}
        <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800 text-[11px] text-zinc-400 flex flex-col gap-1.5">
          <div className="font-semibold text-zinc-200">Autonomous Arbitration Rule:</div>
          <p className="leading-relaxed">
            1. Renewable penetration &gt; 60% triggers non-linear power boosting up to facility nameplate capacity.
          </p>
          <p className="leading-relaxed">
            2. Marginal fossil peaker events curtail deferrable compute batches, shedding peak carbon up to 75%.
          </p>
          <p className="leading-relaxed">
            3. Hard SLA constraints guarantee all AI checkpoint iterations and EV fleet delivery deadlines are satisfied before deadline hour.
          </p>
        </div>
      </div>
    </div>
  );
};
