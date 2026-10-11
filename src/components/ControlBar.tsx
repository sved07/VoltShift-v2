import React from 'react';
import { Play, Pause, Sun, Flame, Moon, RefreshCw, Sparkles, Sliders } from 'lucide-react';

interface ControlBarProps {
  simHour: number;
  onSetHour: (h: number) => void;
  isPeaker: boolean;
  isAutonomous: boolean;
  onToggleAutonomous: (val: boolean) => void;
  onTriggerPeaker: (val: boolean) => void;
  onReset: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  simHour,
  onSetHour,
  isPeaker,
  isAutonomous,
  onToggleAutonomous,
  onTriggerPeaker,
  onReset,
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);

  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onSetHour((simHour + 1) % 24);
    }, 2500);
    return () => clearInterval(interval);
  }, [isPlaying, simHour, onSetHour]);

  const getTimeExplanation = (h: number) => {
    if (h >= 11 && h <= 15) {
      const pm = h === 12 ? 12 : h - 12;
      return `${pm}:00 PM · Peak Solar Generation · Lowest Carbon Intensity`;
    }
    if (h >= 17 && h <= 20) {
      const pm = h - 12;
      return `${pm}:00 PM · Peak Grid Demand · High Fossil Peaker Ramping`;
    }
    if (h >= 1 && h <= 4) {
      return `${h}:00 AM · Overnight Wind Surge · Clean Regional Generation`;
    }
    if (h >= 6 && h <= 8) {
      return `${h}:00 AM · Morning Sunrise Transition`;
    }
    const ampm = h >= 12 ? (h === 12 ? '12:00 PM' : `${h - 12}:00 PM`) : `${h === 0 ? 12 : h}:00 AM`;
    return `${ampm} · Baseline Schedule`;
  };

  return (
    <div className="bg-zinc-950/85 backdrop-blur-2xl border-t border-zinc-800/60 px-6 py-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 font-sans text-xs shrink-0 select-none">
      {/* Simulation Hour Slider & Ticker */}
      <div className="flex flex-1 items-center gap-4">
        {/* Play / Pause Time Loop */}
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className={`h-8 px-3 rounded-xl flex items-center gap-2 font-medium transition-colors border ${
            isPlaying
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
          }`}
          title={isPlaying ? 'Pause simulation clock' : 'Auto-advance 24-hour day'}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          <span>{isPlaying ? 'Pause' : 'Auto Day'}</span>
        </button>

        {/* Time Slider */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-zinc-100 font-medium">
              <span className="font-mono text-sm font-semibold text-emerald-400">
                {simHour.toString().padStart(2, '0')}:00
              </span>
              <span className="text-zinc-400 text-xs">
                {getTimeExplanation(simHour)}
              </span>
            </div>
            <span className="text-zinc-500 text-[11px] hidden sm:inline">Scrub timeline</span>
          </div>

          <input
            type="range"
            min={0}
            max={23}
            step={1}
            value={simHour}
            onChange={(e) => onSetHour(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
          />
        </div>

        {/* Quick Time Presets */}
        <div className="hidden sm:flex items-center gap-1 p-0.5 bg-zinc-900 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => onSetHour(13)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
              simHour === 13 ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Jump to 1:00 PM (Peak Solar)"
          >
            <Sun className="h-3 w-3 text-amber-400" />
            <span>1 PM Solar</span>
          </button>

          <button
            type="button"
            onClick={() => onSetHour(18)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
              simHour === 18 ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Jump to 6:00 PM (Peak Evening Demand)"
          >
            <Flame className="h-3 w-3 text-rose-400" />
            <span>6 PM Peak</span>
          </button>

          <button
            type="button"
            onClick={() => onSetHour(2)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
              simHour === 2 ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Jump to 2:00 AM (Overnight Wind)"
          >
            <Moon className="h-3 w-3 text-indigo-400" />
            <span>2 AM Wind</span>
          </button>
        </div>
      </div>

      {/* Disruption & Mode Controls */}
      <div className="flex items-center gap-2">
        {/* Simulate Peaker Shock */}
        <button
          type="button"
          onClick={() => onTriggerPeaker(!isPeaker)}
          className={`h-8 px-3 rounded-xl flex items-center gap-2 font-medium transition-all border ${
            isPeaker
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-200 font-semibold'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
          }`}
          title="Simulate high-emission gas peaker plants suddenly ramping"
        >
          <Flame className={`h-3.5 w-3.5 ${isPeaker ? 'text-rose-400' : 'text-zinc-400'}`} />
          <span>{isPeaker ? 'Reset Peaker Spike' : 'Simulate Peaker Event'}</span>
        </button>

        {/* Autonomous Mode Toggle - Apple Segmented Control */}
        <div className="flex items-center gap-0.5 p-0.5 bg-zinc-900 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => onToggleAutonomous(true)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              isAutonomous
                ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <span>Autonomous</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleAutonomous(false)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              !isAutonomous
                ? 'bg-zinc-800 text-zinc-200 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="h-3 w-3 text-zinc-400" />
            <span>Unmanaged</span>
          </button>
        </div>

        {/* Reset Counter */}
        <button
          type="button"
          onClick={onReset}
          className="h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors"
          title="Reset cumulative savings counter"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
