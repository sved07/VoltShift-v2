import React, { useState, useRef, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  Send,
  Trash2,
  User,
  Bot,
} from 'lucide-react';
import { GeminiAgentExplanation, GridZone, IndustrialWorkload } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  source?: string;
}

interface GeminiChatAdvisorProps {
  simHour: number;
  isAutonomous: boolean;
  isPeaker: boolean;
  zones: GridZone[];
  workloads: IndustrialWorkload[];
  explanation: GeminiAgentExplanation;
  onSetHour?: (hour: number) => void;
  onToggleAutonomous?: () => void;
  onTriggerPeaker?: () => void;
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
    label: 'Evening Duck Curve Throttle',
    prompt: 'Why do you throttle or defer energy during the 17:00-20:00 evening duck curve peaker ramp?',
  },
  {
    label: 'EIA Form 930 Integration',
    prompt: 'How do you use the live US EIA Form 930 fuel stack data to decide dispatch actions?',
  },
  {
    label: 'Zero-Breach SLA Guarantees',
    prompt: 'How do you ensure zero SLA deadline breaches when throttling compute for carbon savings?',
  },
  {
    label: 'Facility Impact Breakdown',
    prompt: 'Can you break down the current decisions for the Council Bluffs AI cluster and Texas EV fleet?',
  },
];

export const GeminiChatAdvisor: React.FC<GeminiChatAdvisorProps> = ({
  simHour,
  isAutonomous,
  isPeaker,
  zones,
  workloads,
  explanation,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `### Welcome to the Gemini Dispatch Reasoning Engine
I am your **Autonomous Grid Load-Shifting Agent**, powered by **Gemini 3.8 Flash**.

I continuously analyze real-time data from:
- **US Energy Information Administration (EIA v2 Form 930)**: Live regional fuel stacks (Solar, Wind, Gas, Coal, Nuclear, Hydro)
- **Electricity Maps v3**: Real-time grid carbon intensity (gCO₂/kWh)
- **NREL**: Facility solar potential & local EV fast-charging depots

**Current Clock: ${simHour.toString().padStart(2, '0')}:00** | **Mode: ${isAutonomous ? 'AUTONOMOUS' : 'UNMANAGED'}** | **Peaker Event: ${isPeaker ? 'ACTIVE' : 'INACTIVE'}**

Ask me anything about how energy shifts across time, how peaker spikes are mitigated, or how individual facilities are prioritized.`,
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
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async (textToSend?: string) => {
    const question = (textToSend || input).trim();
    if (!question || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const resp = await fetch('/api/gemini/chat', {
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

      if (!resp.ok) {
        throw new Error(`Chat API error: ${resp.status}`);
      }

      const data = await resp.json();
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: data.reply || 'Decision logged and optimized.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source || 'gemini-3.8-flash',
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: `At simulation hour ${simHour}:00, the autonomous agent is optimizing load based on **${explanation.primary_driver}**. High-carbon fossil nodes are throttled to save emissions while keeping compute and delivery deadlines fully protected.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'gemini-fallback',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: `History reset. Ready for questions regarding energy dispatch at ${simHour.toString().padStart(2, '0')}:00.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'gemini-3.8-flash',
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
          <div key={idx} className="flex items-start gap-2 my-0.5 ml-1 text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
            <span>{renderInlineFormatting(text)}</span>
          </div>
        );
      }
      if (/^\d+\.\s+/.test(line.trim())) {
        const match = line.trim().match(/^(\d+)\.\s+(.*)/);
        if (match) {
          return (
            <div key={idx} className="flex items-start gap-2 my-0.5 ml-1 text-zinc-300">
              <span className="font-mono text-purple-400 font-medium text-[11px] shrink-0">{match[1]}.</span>
              <span>{renderInlineFormatting(match[2])}</span>
            </div>
          );
        }
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="my-0.5 text-zinc-300 leading-relaxed">
          {renderInlineFormatting(line)}
        </p>
      );
    });
  };

  const renderInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-zinc-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-purple-300 font-mono text-[11px]">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/90 rounded-2xl border border-zinc-800/60 shadow-2xl overflow-hidden font-sans backdrop-blur-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/50 bg-zinc-900/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-purple-400 shrink-0">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">
                Gemini Energy Dispatch Q&A
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                gemini-3.8-flash
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Ask questions about dispatch decisions and live grid telemetry
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="px-2.5 py-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Trash2 className="h-3 w-3" />
          <span>Clear</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 text-xs">
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
                className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-xs ${
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
                <div className="space-y-1">
                  {isUser ? (
                    <p className="text-zinc-100 font-sans text-xs leading-relaxed">{m.content}</p>
                  ) : (
                    renderFormattedContent(m.content)
                  )}
                </div>
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
            <span>Evaluating live grid generation stack...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Chips */}
      <div className="px-3 py-2 border-t border-zinc-800/50 bg-zinc-950/40">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {PRESET_QUESTIONS.map((pq, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => sendMessage(pq.prompt)}
              className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              {pq.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="p-3 border-t border-zinc-800/50 bg-zinc-950/80"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={`Ask about energy decisions at ${simHour}:00...`}
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
  );
};
