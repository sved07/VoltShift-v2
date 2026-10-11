import { useState, useEffect, useRef, useCallback } from 'react';
import { TelemetryPacket, ClientAction } from '../types';

const INITIAL_PACKET: TelemetryPacket = {
  timestamp: new Date().toISOString(),
  sim_hour: 13,
  is_peaker_event: false,
  is_autonomous_mode: true,
  zones: [
    {
      zone_id: 'CAISO',
      name: 'California ISO',
      carbon_intensity: 118,
      renewable_pct: 68.4,
      solar_mw: 15800,
      wind_mw: 3200,
      coordinates: [36.7783, -119.4179],
      marginal_fuel: 'Surplus Solar (Curtailment Risk)',
      color_tier: 'green',
    },
    {
      zone_id: 'ERCOT',
      name: 'Electric Reliability Council of Texas',
      carbon_intensity: 194,
      renewable_pct: 48.2,
      solar_mw: 18400,
      wind_mw: 14200,
      coordinates: [31.0545, -97.5635],
      marginal_fuel: 'Combined-Cycle Natural Gas',
      color_tier: 'amber',
    },
    {
      zone_id: 'PJM',
      name: 'PJM Interconnection',
      carbon_intensity: 338,
      renewable_pct: 22.5,
      solar_mw: 7900,
      wind_mw: 4200,
      coordinates: [39.9526, -75.1652],
      marginal_fuel: 'Combined-Cycle Gas / Coal',
      color_tier: 'red',
    },
    {
      zone_id: 'MISO',
      name: 'Midcontinent ISO',
      carbon_intensity: 362,
      renewable_pct: 26.1,
      solar_mw: 6800,
      wind_mw: 11400,
      coordinates: [41.8781, -87.6298],
      marginal_fuel: 'Natural Gas / Coal Base',
      color_tier: 'red',
    },
  ],
  workloads: [
    {
      id: 'ai-train-austin',
      site_name: 'Austin Hyperscale AI Training Cluster',
      type: 'AI_TRAINING',
      zone_id: 'ERCOT',
      current_kw: 2350,
      max_kw: 2500,
      baseline_kw: 1800,
      flexibility_score: 0.85,
      deadline_hour: 20,
      status: 'BOOST',
      coordinates: [30.2672, -97.7431],
      sla_progress_pct: 48,
      delta_kw: 550,
    },
    {
      id: 'ev-fleet-dallas',
      site_name: 'Dallas Metro Last-Mile EV Delivery Depot',
      type: 'EV_FLEET',
      zone_id: 'ERCOT',
      current_kw: 1100,
      max_kw: 1200,
      baseline_kw: 800,
      flexibility_score: 0.9,
      deadline_hour: 6,
      status: 'BOOST',
      coordinates: [32.7767, -96.797],
      sla_progress_pct: 42,
      delta_kw: 300,
    },
    {
      id: 'ai-train-sv',
      site_name: 'Silicon Valley LLM Fine-Tuning Pod',
      type: 'AI_TRAINING',
      zone_id: 'CAISO',
      current_kw: 1800,
      max_kw: 1800,
      baseline_kw: 1400,
      flexibility_score: 0.75,
      deadline_hour: 22,
      status: 'BOOST',
      coordinates: [37.3861, -122.0839],
      sla_progress_pct: 54,
      delta_kw: 400,
    },
    {
      id: 'ev-fleet-la',
      site_name: 'Port of Los Angeles Drayage Electric Fleet',
      type: 'EV_FLEET',
      zone_id: 'CAISO',
      current_kw: 2200,
      max_kw: 2200,
      baseline_kw: 1500,
      flexibility_score: 0.95,
      deadline_hour: 8,
      status: 'BOOST',
      coordinates: [33.7432, -118.2673],
      sla_progress_pct: 61,
      delta_kw: 700,
    },
    {
      id: 'ai-train-columbus',
      site_name: 'Columbus Ohio Data Fabric Supercluster',
      type: 'AI_TRAINING',
      zone_id: 'PJM',
      current_kw: 1600,
      max_kw: 3000,
      baseline_kw: 2400,
      flexibility_score: 0.6,
      deadline_hour: 18,
      status: 'THROTTLE',
      coordinates: [39.9612, -82.9988],
      sla_progress_pct: 39,
      delta_kw: -800,
    },
    {
      id: 'ev-fleet-norfolk',
      site_name: 'Mid-Atlantic Freight Commercial Depot',
      type: 'EV_FLEET',
      zone_id: 'PJM',
      current_kw: 650,
      max_kw: 1600,
      baseline_kw: 1100,
      flexibility_score: 0.7,
      deadline_hour: 7,
      status: 'THROTTLE',
      coordinates: [36.8508, -76.2859],
      sla_progress_pct: 34,
      delta_kw: -450,
    },
    {
      id: 'ai-train-chicago',
      site_name: 'Chicago Great Lakes Frontier Model Node',
      type: 'AI_TRAINING',
      zone_id: 'MISO',
      current_kw: 900,
      max_kw: 2000,
      baseline_kw: 1600,
      flexibility_score: 0.8,
      deadline_hour: 21,
      status: 'THROTTLE',
      coordinates: [41.8781, -87.6298],
      sla_progress_pct: 45,
      delta_kw: -700,
    },
    {
      id: 'ev-fleet-twincities',
      site_name: 'Minneapolis Regional Transit Logistics Hub',
      type: 'EV_FLEET',
      zone_id: 'MISO',
      current_kw: 200,
      max_kw: 1400,
      baseline_kw: 950,
      flexibility_score: 0.88,
      deadline_hour: 5,
      status: 'DEFER',
      coordinates: [44.9778, -93.265],
      sla_progress_pct: 29,
      delta_kw: -750,
    },
  ],
  ai_explanation: {
    primary_driver: 'CAISO Solar Curtailment Surplus Window',
    reasoning_summary:
      'Midday irradiance across California and Texas delivers carbon as low as 118 gCO2/kWh. The VoltShift autonomous agent boosted Silicon Valley AI training clusters and LA port freight EV charging by +1,100 kW to absorb surplus solar, while curtailing MISO and PJM nodes to avoid fossil peakers.',
    estimated_carbon_saved_kg: 34.2,
    estimated_cost_saved_usd: 21.6,
    forecast_recommendation:
      'Max out batch compute through 15:30. Ramp down non-urgent distributed jobs before the 17:00 solar duck-curve cliff.',
    hourly_forecast: Array.from({ length: 24 }).map((_, h) => ({
      hour: h,
      carbon_intensity: Math.round(230 - (h >= 10 && h <= 15 ? 110 : h >= 7 && h <= 18 ? 40 : -30)),
      renewable_pct: Math.round(Math.min(85, Math.max(15, 30 + (h >= 9 && h <= 16 ? 45 : 0)))),
      recommended_action: h >= 10 && h <= 15 ? 'BOOST' : h >= 17 && h <= 20 ? 'DEFER' : 'MAINTAIN',
      solar_factor: h >= 11 && h <= 15 ? 1 : 0.2,
      wind_factor: h < 6 || h > 20 ? 0.8 : 0.3,
    })),
  },
  cumulative_metrics: {
    co2_avoided_kg: 4420.8,
    clean_energy_shifted_mwh: 19.85,
    cost_savings_usd: 3120.4,
    improvement_pct: 34.2,
    avg_carbon_managed: 164.2,
    avg_carbon_baseline: 249.5,
    total_active_kw: 10800,
  },
};

export function useGridSocket() {
  const [data, setData] = useState<TelemetryPacket>(INITIAL_PACKET);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendAction = useCallback((action: ClientAction) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(action));
    } else {
      // Fallback via HTTP REST
      fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.packet) {
            setData(res.packet);
            setLastUpdated(new Date());
          }
        })
        .catch((e) => console.warn('HTTP fallback action error:', e));
    }
  }, []);

  const setHour = useCallback((hour: number) => {
    sendAction({ action: 'SET_HOUR', hour });
  }, [sendAction]);

  const toggleAutonomousMode = useCallback((override?: boolean) => {
    sendAction({ action: 'TOGGLE_MODE', autonomous_mode: override });
  }, [sendAction]);

  const triggerPeakerSpike = useCallback((override?: boolean) => {
    sendAction({ action: 'TRIGGER_PEAKER_SPIKE', peaker_active: override });
  }, [sendAction]);

  const toggleTicker = useCallback(() => {
    sendAction({ action: 'TOGGLE_TICKER' });
  }, [sendAction]);

  const resetMetrics = useCallback(() => {
    sendAction({ action: 'RESET_METRICS' });
  }, [sendAction]);

  useEffect(() => {
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/grid-telemetry`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (unmounted) return;
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          if (unmounted) return;
          try {
            const parsed = JSON.parse(event.data);
            if (parsed && parsed.zones) {
              setData(parsed);
              setLastUpdated(new Date());
            }
          } catch (e) {
            console.error('Failed to parse WebSocket telemetry:', e);
          }
        };

        ws.onclose = () => {
          if (unmounted) return;
          setIsConnected(false);
          // Try reconnect after 2 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          if (unmounted) return;
          setIsConnected(false);
        };
      } catch (err) {
        console.warn('WebSocket connection init failed, will retry:', err);
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      }
    };

    connect();

    // Initial fetch snapshot via REST as immediate bootstrap
    fetch('/api/telemetry')
      .then((res) => res.json())
      .then((packet) => {
        if (!unmounted && packet && packet.zones) {
          setData(packet);
          setLastUpdated(new Date());
        }
      })
      .catch(() => {});

    return () => {
      unmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return {
    data,
    isConnected,
    lastUpdated,
    setHour,
    toggleAutonomousMode,
    triggerPeakerSpike,
    toggleTicker,
    resetMetrics,
  };
}
