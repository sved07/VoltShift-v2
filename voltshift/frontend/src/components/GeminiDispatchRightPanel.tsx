import React, { useState, useRef, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  MessageSquare,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Send,
  Trash2,
  Server,
  Truck,
  TrendingDown,
  DollarSign,
  User,
  Bot,
  Zap,
} from 'lucide-react';
import { GridZone, IndustrialWorkload, GeminiAgentExplanation } from '../types';

interface GeminiDispatchRightPanelProps {
  explanation: GeminiAgentExplanation;
  simHour: number;
  isPeaker: boolean;
  isAutonomous: boolean;
  zones: GridZone[];
  workloads: IndustrialWorkload[];
  onSetHour?: (hour: number) => void;
  onToggleAutonomous?: () => void;
  onTriggerPeaker?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  source?: string;
}

const PRESET_QUESTIONS = [
  {
    label: 'Hourly Energy Dynamics',
    prompt: 'How do you change energy based on the time of day and the grid data you currently have?',
  },
  {
    label: 'Midday Solar Absorption',
    prompt: 'Why do you boost AI training workloads during midday solar crest hours?',
  },
  {
    label: 'Evening Peak Avoidance',
    prompt: 'Why do you throttle or defer energy during the 17:00-20:00 evening duck curve peaker ramp?',
  },
  {
    label: 'EIA Form 930 Integration',
    prompt: 'How do you use the live US EIA Form 930 fuel stack data to decide dispatch actions?',
  },
  {
    label: 'SLA Protection Guarantees',
    prompt: 'How do you ensure zero SLA deadline breaches when throttling compute for carbon savings?',
  },
];

export const GeminiDispatchRightPanel: React.FC<GeminiDispatchRightPanelProps> = ({
  explanation,
  simHour,
  isPeaker,
  isAutonomous,
  zones,
  workloads,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse: externalToggleCollapse,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = externalIsCollapsed ?? internalCollapsed;
  const toggleCollapse = externalToggleCollapse ?? (() => setInternalCollapsed((prev) => !prev));

  const [activeTab, setActiveTab] = useState<'REASONING' | 'CHAT'>('REASONING');

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `### Autonomous Dispatch Agent Ready
I analyze real-time grid generation stacks from US EIA Form 930, Electricity Maps, and NREL to shift industrial loads to clean power hours.

Current Time: ${simHour.toString().padStart(2, '0')}:00
Mode: ${isAutonomous ? 'Autonomous Optimization' : 'Unmanaged Schedule'}

Ask me any question about how power is shifted, how tariffs are minimized, or how deadlines are protected.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'gemini-3.8-flash',
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'CHAT') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const handleSend = async (textToSend?: string) => {
    const question = (textToSend || input).trim();
    if (!question || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          simHour,
          isAutonomous,
          isPeaker,
          zones: zones.map((z) => ({
            zone_id: z.zone_id,
            carbon_intensity: z.carbon_intensity,
            renewable_pct: z.renewable_pct,
            solar_mw: z.solar_mw,
            wind_mw: z.wind_mw,
            clean_pct: z.eia_fuel_breakdown?.clean_pct ?? z.renewable_pct,
          })),
          workloads: workloads.map((w) => ({
            id: w.id,
            site_name: w.site_name,
            zone_id: w.zone_id,
            status: w.status,
            current_kw: w.current_kw,
            delta_kw: w.delta_kw,
            sla_progress_pct: w.sla_progress_pct,
            deadline_hour: w.deadline_hour,
          })),
          explanation: {
            primary_driver: explanation.primary_driver,
            reasoning_summary: explanation.reasoning_summary,
            forecast_recommendation: explanation.forecast_recommendation,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: data.reply || 'Decision logged and optimized.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source || 'gemini-3.8-flash',
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const fallbackMessage: ChatMessage = {
        id: `fallback-${Date.now()}`,
        role: 'model',
        content: `At ${simHour.toString().padStart(2, '0')}:00, dispatch decisions are governed by ${explanation.primary_driver}. The system shifts power from high-carbon periods to minimize emissions while guaranteeing all delivery and compute SLAs.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'gemini-fallback',
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: `Conversation cleared. Standing by for questions regarding energy dispatch at ${simHour.toString().padStart(2, '0')}:00.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'gemini-3.8-flash',
      },
    ]);
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-xs font-semibold text-zinc-100 mt-2 mb-1 tracking-tight">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={idx} className="text-xs font-semibold text-zinc-100 mt-2 mb-1 tracking-tight">
            {line.replace('## ', '')}
          </h3>
        );
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const text = line.trim().replace(/^[-*]\s+/, '');
        return (
          <div key={idx} className="flex items-start gap-2 my-1 ml-1 text-zinc-300 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
            <span>{renderInline(text)}</span>
          </div>
        );
      }
      if (/^\d+\.\s+/.test(line.trim())) {
        const match = line.trim().match(/^(\d+)\.\s+(.*)/);
        if (match) {
          return (
            <div key={idx} className="flex items-start gap-2 my-1 ml-1 text-zinc-300 text-xs">
              <span className="font-mono text-purple-400 font-medium text-[11px] shrink-0">{match[1]}.</span>
              <span>{renderInline(match[2])}</span>
            </div>
          );
        }
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="my-1 text-zinc-200 text-xs leading-relaxed">
          {renderInline(line)}
        </p>
      );
    });
  };

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-zinc-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="text-zinc-200">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 font-mono text-[11px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Collapsed Edge Tab
  if (isCollapsed) {
    return (
      <div className="h-full flex items-center shrink-0 z-20">
        <button
          type="button"
          onClick={toggleCollapse}
          className="h-36 w-8 bg-zinc-900/95 hover:bg-zinc-800/95 border-l border-y border-zinc-800 rounded-l-xl shadow-xl flex flex-col items-center justify-between py-3 cursor-pointer group transition-all"
          title="Open Gemini Dispatch Agent"
        >
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />

          <div
            className="text-[10px] font-medium text-zinc-300 tracking-wider uppercase whitespace-nowrap -rotate-90 flex items-center gap-1.5 select-none"
            style={{ transformOrigin: 'center' }}
          >
            <span>Dispatch Agent</span>
          </div>

          <ChevronLeft className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-100 transition-colors" />
        </button>
      </div>
    );
  }

  // Expanded Right Panel - Apple Human Interface Design
  return (
    <aside className="w-96 lg:w-[410px] h-full flex flex-col bg-zinc-950/90 border-l border-zinc-800/60 shadow-2xl backdrop-blur-2xl relative z-20 shrink-0 transition-all font-sans select-none">
      {/* Top Header */}
      <div className="px-4 py-3 border-b border-zinc-800/50 bg-zinc-900/30 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-purple-400 shrink-0">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-zinc-100 truncate tracking-tight">
                Gemini Dispatch Agent
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                gemini-3.8-flash
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Active Balancing</span>
              <span className="text-zinc-600">•</span>
              <span className="font-mono text-zinc-300">{simHour.toString().padStart(2, '0')}:00</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Collapse Panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Segmented Control - Apple Style */}
      <div className="p-2 border-b border-zinc-800/50 bg-zinc-950/50">
        <div className="p-0.5 bg-zinc-900/90 rounded-xl border border-zinc-800/80 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('REASONING')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'REASONING'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-zinc-300" />
            <span>Live Strategy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CHAT')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'CHAT'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
            <span>Ask Questions</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LIVE REASONING CONTENT */}
      {activeTab === 'REASONING' && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 text-xs">
          {/* Main Strategy Card */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/70 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Current Strategy
              </span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                {isPeaker ? (
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span>{explanation.primary_driver}</span>
              </div>
            </div>

            <p className="text-zinc-200 text-xs leading-relaxed bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80 font-sans">
              {explanation.reasoning_summary}
            </p>

            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs">
              <ArrowRight className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-purple-300">Action: </span>
                <span className="text-zinc-300">{explanation.forecast_recommendation}</span>
              </div>
            </div>
          </div>

          {/* Abatement & Cost Impact Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
                <span>Avoided CO₂</span>
              </div>
              <span className="font-semibold font-mono text-emerald-400 text-sm block">
                +{explanation.estimated_carbon_saved_kg} kg
              </span>
              <span className="text-[10px] text-zinc-500">Real-time reduction</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-1">
                <DollarSign className="h-3.5 w-3.5 text-amber-400" />
                <span>Demand Savings</span>
              </div>
              <span className="font-semibold font-mono text-amber-400 text-sm block">
                +${explanation.estimated_cost_saved_usd}
              </span>
              <span className="text-[10px] text-zinc-500">Peak tariff bypass</span>
            </div>
          </div>

          {/* Real-time Workload Dispatch Breakdown */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
              <span>Managed Facilities</span>
              <span className="text-zinc-500">{workloads.length} Sites</span>
            </div>

            <div className="flex flex-col gap-2">
              {workloads.map((site) => (
                <div
                  key={site.id}
                  className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
                        site.type === 'AI_TRAINING'
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {site.type === 'AI_TRAINING' ? (
                        <Server className="h-3 w-3" />
                      ) : (
                        <Truck className="h-3 w-3" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-zinc-200 font-medium truncate block text-xs">
                        {site.site_name}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {site.zone_id} • {site.current_kw} kW
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium font-mono shrink-0 ${
                      site.status === 'BOOST'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : site.status === 'THROTTLE'
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        : site.status === 'DEFER'
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {site.status === 'BOOST'
                      ? `+${site.delta_kw} kW`
                      : site.status === 'THROTTLE'
                      ? `${site.delta_kw} kW`
                      : site.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Chat Switcher CTA */}
          <button
            type="button"
            onClick={() => setActiveTab('CHAT')}
            className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
            <span>Ask questions about this hour's decisions</span>
          </button>
        </div>
      )}

      {/* TAB 2: INTERACTIVE CHAT Q&A */}
      {activeTab === 'CHAT' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat Controls Ribbon */}
          <div className="px-3.5 py-2 border-b border-zinc-800/50 bg-zinc-900/20 flex items-center justify-between text-[11px] shrink-0">
            <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3 w-3 text-purple-400" />
              <span>Questions & Answers</span>
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
              title="Clear conversation"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear</span>
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 min-h-0 text-xs">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 max-w-[92%] ${
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                      isUser
                        ? 'bg-zinc-800 text-zinc-300'
                        : 'bg-zinc-900 text-purple-400 border border-zinc-800'
                    }`}
                  >
                    {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-zinc-800 text-zinc-100 rounded-tr-none'
                        : 'bg-zinc-900/80 border border-zinc-800/70 text-zinc-200 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {renderFormattedContent(m.content)}
                    <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-zinc-500 font-mono">
                      <span>{m.timestamp}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 mr-auto max-w-[85%] text-xs text-zinc-300">
                <BrainCircuit className="h-3.5 w-3.5 animate-spin text-purple-400" />
                <span>Evaluating grid generation stack...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Preset Chips - Apple Rounded Pills */}
          <div className="px-3 py-2 border-t border-zinc-800/50 bg-zinc-950/40 flex items-center gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
            {PRESET_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q.prompt)}
                disabled={isLoading}
                className="whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Chat Input - Apple Style */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-zinc-800/50 bg-zinc-950/80 flex items-center gap-2 shrink-0"
          >
            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask about energy decisions at ${simHour}:00...`}
                disabled={isLoading}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-4 pr-10 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 transition-all font-sans"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-100 transition-colors cursor-pointer"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
};
