import React from 'react';
import { GeminiAgentExplanation, GridZone, IndustrialWorkload } from '../types';
import {
  BrainCircuit,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Sun,
  TrendingDown,
  DollarSign,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { GeminiChatAdvisor } from '../components/GeminiChatAdvisor';

interface AIAuditPageProps {
  explanation: GeminiAgentExplanation;
  simHour: number;
  onSelectHour: (h: number) => void;
  isPeaker: boolean;
  isAutonomous: boolean;
  zones?: GridZone[];
  workloads?: IndustrialWorkload[];
  onToggleAutonomous?: () => void;
  onTriggerPeaker?: () => void;
}

export const AIAuditPage: React.FC<AIAuditPageProps> = ({
  explanation,
  simHour,
  onSelectHour,
  isPeaker,
  isAutonomous,
  zones = [],
  workloads = [],
  onToggleAutonomous,
  onTriggerPeaker,
}) => {
  const forecast = explanation.hourly_forecast || [];

  return (
    <div className="w-full h-full overflow-y-auto bg-zinc-950 p-4 lg:p-6 font-sans">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-5">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-100 font-sans tracking-tight">
                  Gemini Autonomous Decision Audit
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300">
                  gemini-3.8-flash
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                  EIA Form 930 + Electricity Maps
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time structured reasoning, catalyst analysis, and interactive energy dispatch Q&A
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2">
              <span className="text-zinc-500 text-[10px] uppercase font-mono">Current Simulation Hour</span>
              <span className="font-mono font-bold text-zinc-100">{simHour.toString().padStart(2, '0')}:00</span>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Visual curves & reasonings on left, Gemini chat on right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Reasoning & Forecast Analytics (7 cols on lg, 7 cols on xl) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Live Autonomous Reasoning Card */}
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
                    Live Autonomous Agent Reasoning
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                    {isPeaker ? (
                      <ShieldAlert className="h-4 w-4 text-rose-400" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                    )}
                    <span>{explanation.primary_driver}</span>
                  </div>
                </div>

                <blockquote className="text-sm text-zinc-200 leading-relaxed bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800/80 italic font-sans">
                  "{explanation.reasoning_summary}"
                </blockquote>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs flex-1">
                  <ArrowRight className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-purple-300">Tactical Recommendation: </span>
                    <span className="text-zinc-300">{explanation.forecast_recommendation}</span>
                  </div>
                </div>
              </div>

              {/* Impact stats row */}
              <div className="grid grid-cols-2 gap-3 font-mono pt-1">
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500 text-[10px] font-sans block">Avoided Emissions</span>
                    <span className="text-base font-bold text-emerald-400">
                      +{explanation.estimated_carbon_saved_kg} kg CO₂
                    </span>
                  </div>
                  <TrendingDown className="h-4 w-4 text-emerald-400" />
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500 text-[10px] font-sans block">Demand Savings</span>
                    <span className="text-base font-bold text-amber-400">
                      +${explanation.estimated_cost_saved_usd} USD
                    </span>
                  </div>
                  <DollarSign className="h-4 w-4 text-amber-400" />
                </div>
              </div>
            </div>

            {/* 24-Hour Forward Carbon Curve & Forecast */}
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 font-sans tracking-tight">
                    24-Hour Predictive Carbon Curve & Dispatch Schedule
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Click any hourly bar to simulate dispatch state at that hour
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> BOOST
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-zinc-500" /> MAINTAIN
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> THROTTLE
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> DEFER
                  </span>
                </div>
              </div>

              {/* Bar Visualizer */}
              <div className="h-40 flex items-end gap-1.5 pt-4 pb-2 border-b border-zinc-800">
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
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1 text-[9px] font-mono text-zinc-300">
                        {pt.carbon_intensity}g
                      </div>
                      <div
                        className={`w-full rounded-t transition-all group-hover:opacity-100 ${barColor} ${
                          isCurrent ? 'ring-2 ring-zinc-100 opacity-100 scale-y-105' : 'opacity-70'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                      <span
                        className={`text-[9px] font-mono mt-1 ${
                          isCurrent ? 'text-emerald-400 font-bold' : 'text-zinc-500'
                        }`}
                      >
                        {pt.hour.toString().padStart(2, '0')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Sample Hourly Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {forecast
                  .filter((_, idx) => idx % 6 === 0)
                  .map((pt) => (
                    <div
                      key={pt.hour}
                      onClick={() => onSelectHour(pt.hour)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        pt.hour === simHour
                          ? 'bg-zinc-900 border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] mb-1">
                        <span className="font-semibold text-zinc-200">{pt.hour}:00</span>
                        <span
                          className={`font-bold ${
                            pt.recommended_action === 'BOOST'
                              ? 'text-emerald-400'
                              : pt.recommended_action === 'THROTTLE'
                              ? 'text-amber-400'
                              : pt.recommended_action === 'DEFER'
                              ? 'text-rose-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {pt.recommended_action}
                        </span>
                      </div>
                      <div className="text-zinc-400 text-[10px]">
                        <span>{pt.carbon_intensity} gCO₂/kWh</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Autonomous Principles & SLA Invariants */}
            <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400 font-sans">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-zinc-200 font-semibold text-xs">
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>Solar Curtailment</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  During midday crest (11:00-15:00), load boosts AI training compute and EV fleets to absorb cheap, clean surplus power.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-zinc-200 font-semibold text-xs">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                  <span>Peaker Interception</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  During high-demand evening fossil ramps (17:00-20:00), the agent throttles non-essential distributed compute by 75%.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-zinc-200 font-semibold text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Zero-Breach SLA</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  If a critical deadline buffer tightens, the agent automatically prioritizes job completion over carbon conservation.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Dedicated Gemini Dispatch Agent & Chattable Q&A (5 cols on lg) */}
          <div className="lg:col-span-5 h-[760px] sticky top-4">
            <GeminiChatAdvisor
              simHour={simHour}
              isAutonomous={isAutonomous}
              isPeaker={isPeaker}
              zones={zones}
              workloads={workloads}
              explanation={explanation}
              onSetHour={onSelectHour}
              onToggleAutonomous={onToggleAutonomous}
              onTriggerPeaker={onTriggerPeaker}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
