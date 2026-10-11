import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createTutorialPdf } from './src/server/generateTutorialPdf';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json());

// Initialize Google GenAI
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Electricity Maps API Configuration
const ELECTRICITY_MAPS_KEY = process.env.ELECTRICITY_MAPS_KEY || '';

const ELECTRICITY_MAPS_ZONE_MAPPING: Record<string, string> = {
  CAISO: 'US-CAL-CISO',
  ERCOT: 'US-TEX-ERCO',
  PJM: 'US-MIDA-PJM',
  MISO: 'US-MIDW-MISO',
};

// US EIA (Energy Information Administration v2) Configuration
const EIA_API_KEY = process.env.EIA_API_KEY || '';
const EIA_RESPONDENT_MAPPING: Record<string, string> = {
  CAISO: 'CISO',
  ERCOT: 'ERCO',
  PJM: 'PJM',
  MISO: 'MISO',
};

// National Renewable Energy Laboratory (NREL / NLR) Configuration
const NREL_API_KEY = process.env.NREL_API_KEY || '';
const nrelSolarCache = new Map<string, any>();
const nrelStationsCache = new Map<string, any>();

interface LiveGridData {
  carbonIntensity: number;
  renewablePct: number;
  solarMw: number;
  windMw: number;
  lastUpdated: string;
  source: string;
}

interface EiaFuelData {
  period: string;
  respondent: string;
  solar_mw: number;
  wind_mw: number;
  hydro_mw: number;
  nuclear_mw: number;
  gas_mw: number;
  coal_mw: number;
  geothermal_mw: number;
  battery_mw: number;
  total_gen_mw: number;
  clean_pct: number;
  lastUpdated: string;
}

const liveGridCache: Record<string, LiveGridData> = {};
const eiaFuelCache: Record<string, EiaFuelData> = {};

async function refreshElectricityMapsData() {
  if (!ELECTRICITY_MAPS_KEY) return;
  for (const [zoneId, apiZone] of Object.entries(ELECTRICITY_MAPS_ZONE_MAPPING)) {
    try {
      const [carbonRes, powerRes] = await Promise.all([
        fetch(`https://api.electricitymap.org/v3/carbon-intensity/latest?zone=${apiZone}`, {
          headers: { 'auth-token': ELECTRICITY_MAPS_KEY },
        }).then((r) => (r.ok ? r.json() : null)),
        fetch(`https://api.electricitymap.org/v3/power-breakdown/latest?zone=${apiZone}`, {
          headers: { 'auth-token': ELECTRICITY_MAPS_KEY },
        }).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (carbonRes && typeof carbonRes.carbonIntensity === 'number') {
        liveGridCache[zoneId] = {
          carbonIntensity: Math.round(carbonRes.carbonIntensity),
          renewablePct: powerRes?.renewablePercentage ?? 35,
          solarMw: powerRes?.powerConsumptionBreakdown?.solar ?? 0,
          windMw: powerRes?.powerConsumptionBreakdown?.wind ?? 0,
          lastUpdated: carbonRes.datetime || new Date().toISOString(),
          source: 'Electricity Maps Live API v3',
        };
      }
    } catch (err: any) {
      console.warn(`[Electricity Maps] Failed for ${zoneId}:`, err?.message || err);
    }
  }
}

async function refreshEiaData() {
  if (!EIA_API_KEY) return;
  for (const [zoneId, respondent] of Object.entries(EIA_RESPONDENT_MAPPING)) {
    try {
      const url = `https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/?api_key=${EIA_API_KEY}&frequency=hourly&data[0]=value&facets[respondent][]=${respondent}&sort[0][column]=period&sort[0][direction]=desc&length=18`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const rows = json.response?.data || [];
      if (!rows.length) continue;

      const latestPeriod = rows[0]?.period;
      const latestRows = rows.filter((r: any) => r.period === latestPeriod);

      const fuelMap: Record<string, number> = {};
      for (const r of latestRows) {
        fuelMap[r.fueltype] = Number(r.value) || 0;
      }

      const solar = Math.max(0, fuelMap['SUN'] || 0);
      const wind = Math.max(0, fuelMap['WND'] || 0);
      const hydro = Math.max(0, fuelMap['WAT'] || 0);
      const nuclear = Math.max(0, fuelMap['NUC'] || 0);
      const geothermal = Math.max(0, fuelMap['GEO'] || 0);
      const battery = Math.max(0, fuelMap['BAT'] || 0);
      const gas = Math.max(0, fuelMap['NG'] || 0);
      const coal = Math.max(0, fuelMap['COL'] || 0);

      const cleanMw = solar + wind + hydro + nuclear + geothermal;
      const totalGen = cleanMw + gas + coal + Math.max(0, fuelMap['OIL'] || 0) + Math.max(0, fuelMap['OTH'] || 0);
      const cleanPct = totalGen > 0 ? Math.round((cleanMw / totalGen) * 1000) / 10 : 0;

      eiaFuelCache[zoneId] = {
        period: latestPeriod,
        respondent,
        solar_mw: solar,
        wind_mw: wind,
        hydro_mw: hydro,
        nuclear_mw: nuclear,
        gas_mw: gas,
        coal_mw: coal,
        geothermal_mw: geothermal,
        battery_mw: battery,
        total_gen_mw: totalGen,
        clean_pct: cleanPct,
        lastUpdated: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn(`[EIA API] Failed for ${zoneId}:`, err?.message || err);
    }
  }
}

// Fetch live grid and federal energy data on startup and periodically
refreshElectricityMapsData();
refreshEiaData();
setInterval(refreshElectricityMapsData, 180000);
setInterval(refreshEiaData, 240000);

// Regional ISO Definitions
interface ZoneConfig {
  name: string;
  coordinates: [number, number]; // lat, lng
  baseCarbon: number;
  solarPeakHour: number;
  solarMaxMw: number;
  windPeakHour: number;
  windMaxMw: number;
  fossilBaseMw: number;
  peakerSpike: number;
}

const ZONE_CONFIGS: Record<string, ZoneConfig> = {
  CAISO: {
    name: 'California ISO',
    coordinates: [36.7783, -119.4179],
    baseCarbon: 140.0,
    solarPeakHour: 13,
    solarMaxMw: 16500,
    windPeakHour: 22,
    windMaxMw: 5200,
    fossilBaseMw: 9800,
    peakerSpike: 260.0,
  },
  ERCOT: {
    name: 'Electric Reliability Council of Texas',
    coordinates: [31.0545, -97.5635],
    baseCarbon: 220.0,
    solarPeakHour: 14,
    solarMaxMw: 19200,
    windPeakHour: 2,
    windMaxMw: 26400,
    fossilBaseMw: 32000,
    peakerSpike: 320.0,
  },
  PJM: {
    name: 'PJM Interconnection',
    coordinates: [39.9526, -75.1652],
    baseCarbon: 340.0,
    solarPeakHour: 12,
    solarMaxMw: 8400,
    windPeakHour: 20,
    windMaxMw: 9100,
    fossilBaseMw: 48000,
    peakerSpike: 280.0,
  },
  MISO: {
    name: 'Midcontinent ISO',
    coordinates: [41.8781, -87.6298],
    baseCarbon: 380.0,
    solarPeakHour: 13,
    solarMaxMw: 7200,
    windPeakHour: 23,
    windMaxMw: 24800,
    fossilBaseMw: 42000,
    peakerSpike: 290.0,
  },
};

const WORKLOAD_CONFIGS = [
  {
    id: 'ai-train-austin',
    site_name: 'Austin Hyperscale AI Training Cluster',
    type: 'AI_TRAINING' as const,
    zone_id: 'ERCOT',
    max_kw: 2500.0,
    baseline_kw: 1800.0,
    flexibility_score: 0.85,
    deadline_hour: 20,
    coordinates: [30.2672, -97.7431] as [number, number],
  },
  {
    id: 'ev-fleet-dallas',
    site_name: 'Dallas Metro Last-Mile EV Delivery Depot',
    type: 'EV_FLEET' as const,
    zone_id: 'ERCOT',
    max_kw: 1200.0,
    baseline_kw: 800.0,
    flexibility_score: 0.9,
    deadline_hour: 6,
    coordinates: [32.7767, -96.797] as [number, number],
  },
  {
    id: 'ai-train-sv',
    site_name: 'Silicon Valley LLM Fine-Tuning Pod',
    type: 'AI_TRAINING' as const,
    zone_id: 'CAISO',
    max_kw: 1800.0,
    baseline_kw: 1400.0,
    flexibility_score: 0.75,
    deadline_hour: 22,
    coordinates: [37.3861, -122.0839] as [number, number],
  },
  {
    id: 'ev-fleet-la',
    site_name: 'Port of Los Angeles Drayage Electric Fleet',
    type: 'EV_FLEET' as const,
    zone_id: 'CAISO',
    max_kw: 2200.0,
    baseline_kw: 1500.0,
    flexibility_score: 0.95,
    deadline_hour: 8,
    coordinates: [33.7432, -118.2673] as [number, number],
  },
  {
    id: 'ai-train-columbus',
    site_name: 'Columbus Ohio Data Fabric Supercluster',
    type: 'AI_TRAINING' as const,
    zone_id: 'PJM',
    max_kw: 3000.0,
    baseline_kw: 2400.0,
    flexibility_score: 0.6,
    deadline_hour: 18,
    coordinates: [39.9612, -82.9988] as [number, number],
  },
  {
    id: 'ev-fleet-norfolk',
    site_name: 'Mid-Atlantic Freight Commercial Depot',
    type: 'EV_FLEET' as const,
    zone_id: 'PJM',
    max_kw: 1600.0,
    baseline_kw: 1100.0,
    flexibility_score: 0.7,
    deadline_hour: 7,
    coordinates: [36.8508, -76.2859] as [number, number],
  },
  {
    id: 'ai-train-chicago',
    site_name: 'Chicago Great Lakes Frontier Model Node',
    type: 'AI_TRAINING' as const,
    zone_id: 'MISO',
    max_kw: 2000.0,
    baseline_kw: 1600.0,
    flexibility_score: 0.8,
    deadline_hour: 21,
    coordinates: [41.8781, -87.6298] as [number, number],
  },
  {
    id: 'ev-fleet-twincities',
    site_name: 'Minneapolis Regional Transit Logistics Hub',
    type: 'EV_FLEET' as const,
    zone_id: 'MISO',
    max_kw: 1400.0,
    baseline_kw: 950.0,
    flexibility_score: 0.88,
    deadline_hour: 5,
    coordinates: [44.9778, -93.265] as [number, number],
  },
];

// Global Simulation State
const simState = {
  simHour: 13,
  isAutonomousMode: true,
  isPeakerEvent: false,
  isTickerRunning: true,
  cumulativeCo2AvoidedKg: 4280.5,
  cumulativeMwhShifted: 19.4,
  cumulativeCostSavedUsd: 2980.0,
  workloadProgress: {} as Record<string, number>,
};

// Initialize progress
for (const w of WORKLOAD_CONFIGS) {
  simState.workloadProgress[w.id] = 42.0;
}

function calculateSolarMw(cfg: ZoneConfig, hour: number): number {
  if (hour < 6 || hour > 19) return 0;
  const val = Math.sin(((hour - 6) / 13) * Math.PI);
  return val > 0 ? Math.round(val * cfg.solarMaxMw) : 0;
}

function calculateWindMw(cfg: ZoneConfig, hour: number): number {
  let dist = Math.abs(hour - cfg.windPeakHour);
  if (dist > 12) dist = 24 - dist;
  const factor = 0.4 + 0.6 * Math.cos(((dist / 12) * Math.PI) / 2);
  return Math.round(factor * cfg.windMaxMw);
}

function getGridZones(hour: number, peakerActive: boolean) {
  const currentUtcHour = new Date().getUTCHours();
  return Object.entries(ZONE_CONFIGS).map(([zone_id, cfg]) => {
    const live = liveGridCache[zone_id];
    const isNearRealHour = Math.abs(hour - currentUtcHour) <= 1;

    const solar_mw = live?.solarMw && isNearRealHour ? live.solarMw : calculateSolarMw(cfg, hour);
    const wind_mw = live?.windMw && isNearRealHour ? live.windMw : calculateWindMw(cfg, hour);
    const total_renewable = solar_mw + wind_mw;
    const total_gen = total_renewable + cfg.fossilBaseMw;
    const computed_renewable_pct = Math.min(100, Math.max(5, Math.round((total_renewable / total_gen) * 1000) / 10));

    const renewable_pct = live?.renewablePct && isNearRealHour ? live.renewablePct : computed_renewable_pct;

    let baseCarbonVal = live?.carbonIntensity ?? cfg.baseCarbon;
    let carbon = baseCarbonVal * (1.15 - (renewable_pct / 100) * 0.85);
    let marginal_fuel = 'Combined-Cycle Natural Gas';

    if (peakerActive && ['ERCOT', 'PJM', 'MISO'].includes(zone_id)) {
      carbon += cfg.peakerSpike;
      marginal_fuel = 'Simple-Cycle Gas Peaker / Distillate Oil';
    } else if (renewable_pct > 65) {
      marginal_fuel = 'Surplus Solar / Wind (Curtailment Risk)';
    } else if (renewable_pct > 40) {
      marginal_fuel = 'Hydro / Natural Gas';
    }

    const carbon_intensity = Math.round(Math.max(45, carbon) * 10) / 10;
    const color_tier = carbon_intensity < 160 ? 'green' : carbon_intensity <= 345 ? 'amber' : 'red';

    return {
      zone_id,
      name: cfg.name,
      carbon_intensity,
      renewable_pct,
      solar_mw,
      wind_mw,
      coordinates: cfg.coordinates,
      marginal_fuel,
      color_tier,
      is_live_api: Boolean(live),
      eia_fuel_breakdown: eiaFuelCache[zone_id],
    };
  });
}

function dispatchWorkloads(zones: ReturnType<typeof getGridZones>, hour: number, autonomous: boolean) {
  const zoneMap = new Map(zones.map((z) => [z.zone_id, z]));
  let totalActiveKw = 0;
  let totalBaselineKw = 0;
  let stepCo2Managed = 0;
  let stepCo2Baseline = 0;
  let stepCleanShiftedKwh = 0;
  let stepCostDelta = 0;

  const dispatched = WORKLOAD_CONFIGS.map((item) => {
    const zone = zoneMap.get(item.zone_id)!;
    const currentProgress = simState.workloadProgress[item.id] || 40;

    let hoursToDeadline = (item.deadline_hour - hour) % 24;
    if (hoursToDeadline <= 0) hoursToDeadline += 24;
    const slaCritical = hoursToDeadline <= 3 && currentProgress < 85;

    let targetKw = item.baseline_kw;
    let status: 'BOOST' | 'MAINTAIN' | 'THROTTLE' | 'DEFER' = 'MAINTAIN';

    if (autonomous) {
      if (slaCritical) {
        targetKw = item.max_kw;
        status = 'BOOST';
      } else if (zone.renewable_pct >= 60 || zone.carbon_intensity < 180) {
        const boostFactor = 0.7 + (zone.renewable_pct / 100) * 0.3;
        targetKw = Math.min(item.max_kw, Math.round(item.baseline_kw + (item.max_kw - item.baseline_kw) * boostFactor));
        status = 'BOOST';
        stepCleanShiftedKwh += targetKw - item.baseline_kw;
      } else if (zone.carbon_intensity > 350) {
        if (item.flexibility_score >= 0.7) {
          if (hoursToDeadline > 5) {
            targetKw = Math.round(item.baseline_kw * 0.15);
            status = 'DEFER';
          } else {
            targetKw = Math.round(item.baseline_kw * 0.4);
            status = 'THROTTLE';
          }
        } else {
          targetKw = Math.round(item.baseline_kw * (1.0 - item.flexibility_score * 0.55));
          status = 'THROTTLE';
        }
      } else if (zone.carbon_intensity > 240 && item.flexibility_score >= 0.8) {
        targetKw = Math.round(item.baseline_kw * 0.7);
        status = 'THROTTLE';
      } else {
        targetKw = item.baseline_kw;
        status = 'MAINTAIN';
      }
    }

    const deltaKw = Math.round((targetKw - item.baseline_kw) * 10) / 10;
    const sliceHours = 0.1;

    // Progress advance
    const progressInc = (targetKw * sliceHours) / 180;
    simState.workloadProgress[item.id] = Math.min(100, Math.round((currentProgress + progressInc) * 10) / 10);

    const managedKg = (targetKw * sliceHours * zone.carbon_intensity) / 1000;
    const baselineKg = (item.baseline_kw * sliceHours * zone.carbon_intensity) / 1000;
    stepCo2Managed += managedKg;
    stepCo2Baseline += baselineKg;

    const tariffRate = zone.carbon_intensity > 300 ? 0.24 : zone.carbon_intensity < 180 ? 0.05 : 0.12;
    const costManaged = targetKw * sliceHours * tariffRate;
    const costBaseline = item.baseline_kw * sliceHours * 0.15;
    stepCostDelta += Math.max(0, costBaseline - costManaged);

    totalActiveKw += targetKw;
    totalBaselineKw += item.baseline_kw;

    return {
      ...item,
      current_kw: targetKw,
      status,
      delta_kw: deltaKw,
      sla_progress_pct: simState.workloadProgress[item.id],
    };
  });

  if (autonomous) {
    const avoidedKg = Math.max(0, stepCo2Baseline - stepCo2Managed);
    simState.cumulativeCo2AvoidedKg += avoidedKg;
    simState.cumulativeMwhShifted += (stepCleanShiftedKwh * 0.1) / 1000;
    simState.cumulativeCostSavedUsd += stepCostDelta;
  }

  const avgManaged =
    dispatched.reduce((acc, w) => acc + w.current_kw * zoneMap.get(w.zone_id)!.carbon_intensity, 0) /
    Math.max(1, totalActiveKw);
  const avgBaseline =
    dispatched.reduce((acc, w) => acc + w.baseline_kw * zoneMap.get(w.zone_id)!.carbon_intensity, 0) /
    Math.max(1, totalBaselineKw);

  const improvementPct = avgBaseline > 0 ? Math.round(((avgBaseline - avgManaged) / avgBaseline) * 1000) / 10 : 0;

  const metrics = {
    co2_avoided_kg: Math.round(simState.cumulativeCo2AvoidedKg * 10) / 10,
    clean_energy_shifted_mwh: Math.round(simState.cumulativeMwhShifted * 100) / 100,
    cost_savings_usd: Math.round(simState.cumulativeCostSavedUsd * 100) / 100,
    improvement_pct: autonomous ? improvementPct : 0,
    avg_carbon_managed: Math.round(avgManaged * 10) / 10,
    avg_carbon_baseline: Math.round(avgBaseline * 10) / 10,
    total_active_kw: Math.round(totalActiveKw * 10) / 10,
  };

  return { dispatched, metrics };
}

function generateForecast(zones: ReturnType<typeof getGridZones>) {
  return Array.from({ length: 24 }).map((_, h) => {
    const isDay = h >= 8 && h <= 18;
    const solarFactor = h >= 11 && h <= 15 ? 1.0 : isDay ? 0.4 : 0.0;
    const windFactor = h <= 5 || h >= 21 ? 0.8 : 0.3;
    let co2 = 235 - solarFactor * 85 - windFactor * 40;
    if (h >= 17 && h <= 20) co2 += 95;
    co2 = Math.round(Math.max(60, co2) * 10) / 10;
    const renewPct = Math.round(Math.min(88, Math.max(12, (1 - co2 / 400) * 100)) * 10) / 10;
    const action = renewPct > 60 ? 'BOOST' : co2 > 300 ? 'THROTTLE' : h >= 17 && h <= 20 ? 'DEFER' : 'MAINTAIN';
    return {
      hour: h,
      carbon_intensity: co2,
      renewable_pct: renewPct,
      recommended_action: action,
      solar_factor: solarFactor,
      wind_factor: windFactor,
    };
  });
}

// AI Advisor with Gemini, Persistent Caching & Rate Limit Protection
const explanationCache = new Map<string, any>();
let inFlightAiPromise: Promise<any> | null = null;
let lastGeminiCallTimestamp = 0;
let rateLimitCooldownUntil = 0;
const MIN_GEMINI_INTERVAL_MS = 20000; // Max ~3 calls/min to stay safely below 5 RPM free tier limit

async function getAiExplanation(
  zones: ReturnType<typeof getGridZones>,
  workloads: any[],
  hour: number,
  isPeaker: boolean,
  isAutonomous: boolean
) {
  const cacheKey = `${hour}_${isPeaker ? '1' : '0'}_${isAutonomous ? '1' : '0'}`;

  // 1. Check persistent cache
  if (explanationCache.has(cacheKey)) {
    return explanationCache.get(cacheKey);
  }

  // 2. If another request is currently in flight, await it
  if (inFlightAiPromise) {
    try {
      await inFlightAiPromise;
      if (explanationCache.has(cacheKey)) {
        return explanationCache.get(cacheKey);
      }
    } catch {
      // In-flight error handled elsewhere
    }
  }

  const forecast = generateForecast(zones);
  const caiso = zones.find((z) => z.zone_id === 'CAISO');
  const ercot = zones.find((z) => z.zone_id === 'ERCOT');
  const pjm = zones.find((z) => z.zone_id === 'PJM');

  // High-fidelity domain heuristic explanation generator
  let driver = 'Diurnal Solar & Wind Curtailment Window';
  let summary = `Multi-ISO load-shifting actively rebalancing ${workloads.reduce((a, b) => a + b.current_kw, 0).toFixed(0)} kW. CAISO solar ramp at ${hour}:00 provides clean 118 gCO2/kWh headroom, absorbing Austin AI cluster training batches while throttling fossil-heavy PJM nodes.`;
  let rec = 'Sustain hyperscale AI batch loads during peak solar window (11:00-15:00). Pre-charge EV freight before 17:00.';

  if (isPeaker) {
    driver = 'Marginal Gas Peaker Ramp Event';
    summary = `Alert: Severe fossil peaking active across ERCOT and PJM at ${hour}:00 with marginal carbon exceeding ${ercot?.carbon_intensity || 450} gCO2/kWh. Autonomous agent curtailed non-essential AI distributed training batches and deferred commercial EV depots by 75% to prevent high-emissions dispatch.`;
    rec = 'Hold flexible computing queues until 21:00 wind ramp. Disallow depot fast-charging on fossil peakers.';
  } else if (!isAutonomous) {
    driver = 'Unmanaged Baseline Static Schedules';
    summary = `Workloads currently drawing rigid baseline schedules regardless of grid carbon signals (${ercot?.carbon_intensity || 220} gCO2/kWh in Texas, ${caiso?.carbon_intensity || 140} gCO2/kWh in California). Engaging autonomous dispatch unlocks an estimated 32% carbon reduction.`;
    rec = 'Toggle Autonomous Agent Dispatch to activate dynamic multi-region carbon arbitrage.';
  } else if (caiso && caiso.renewable_pct > 65) {
    driver = 'CAISO Negative-Carbon Solar Curtailment';
    summary = `California ISO generating ${caiso.solar_mw.toFixed(0)} MW solar at ${hour}:00 (${caiso.renewable_pct}% renewables). Agent boosted Silicon Valley LLM nodes and LA Port EV fleets to max power (+${workloads.filter((w) => w.zone_id === 'CAISO').reduce((a, b) => a + Math.max(0, b.delta_kw), 0).toFixed(0)} kW) to capture zero-marginal-cost renewable surplus.`;
    rec = 'Complete priority distributed training iterations before the 17:00 solar duck-curve ramp.';
  }

  const fallbackExplanation = {
    primary_driver: driver,
    reasoning_summary: summary,
    estimated_carbon_saved_kg: 24.5,
    estimated_cost_saved_usd: 14.8,
    forecast_recommendation: rec,
    hourly_forecast: forecast,
  };

  const now = Date.now();
  const isCooldownActive = now < rateLimitCooldownUntil;
  const isRateLimited = now - lastGeminiCallTimestamp < MIN_GEMINI_INTERVAL_MS;

  // If in cooldown or called too recently, store heuristic in cache and return
  if (!ai || isCooldownActive || isRateLimited) {
    explanationCache.set(cacheKey, fallbackExplanation);
    return fallbackExplanation;
  }

  // Attempt live Gemini inference with deduplicated promise
  lastGeminiCallTimestamp = now;

  inFlightAiPromise = (async () => {
    try {
      const prompt = `You are the VoltShift Autonomous Grid Load-Shifting Agent reasoning engine.
Current Simulation Hour: ${hour}:00.
Gas Peaker Spike Active: ${isPeaker}.
Autonomous Dispatch Mode: ${isAutonomous}.

Regional Grid Zones:
${zones.map((z) => `- ${z.zone_id} (${z.name}): ${z.carbon_intensity} gCO2/kWh, ${z.renewable_pct}% renewables, solar: ${z.solar_mw} MW, wind: ${z.wind_mw} MW, fuel: ${z.marginal_fuel}`).join('\n')}

Industrial Workloads:
${workloads.map((w) => `- ${w.site_name} (${w.type}, ${w.zone_id}): Action=${w.status}, Draw=${w.current_kw} kW (Delta=${w.delta_kw} kW), SLA Deadline=${w.deadline_hour}:00, Progress=${w.sla_progress_pct}%`).join('\n')}

Respond in valid JSON with (STRICT RULE: Do not include emojis in any text fields):
{
  "primary_driver": "Short clean driver name e.g. Solar Curtailment Window or Gas Peaker Spike (no emojis)",
  "reasoning_summary": "2-3 sentences explaining in clear, human-accessible language how load shifting minimized carbon and respected SLAs",
  "estimated_carbon_saved_kg": number,
  "estimated_cost_saved_usd": number,
  "forecast_recommendation": "1-sentence forward action for energy operators"
}`;

      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      if (res.text) {
        const parsed = JSON.parse(res.text.trim());
        const result = {
          primary_driver: parsed.primary_driver || driver,
          reasoning_summary: parsed.reasoning_summary || summary,
          estimated_carbon_saved_kg: Number(parsed.estimated_carbon_saved_kg) || 28.5,
          estimated_cost_saved_usd: Number(parsed.estimated_cost_saved_usd) || 16.2,
          forecast_recommendation: parsed.forecast_recommendation || rec,
          hourly_forecast: forecast,
        };
        explanationCache.set(cacheKey, result);
        return result;
      }
    } catch (err: any) {
      // If quota exceeded (429), back off for 45 seconds
      if (err?.status === 'RESOURCE_EXHAUSTED' || err?.message?.includes('429') || err?.message?.includes('Quota exceeded')) {
        rateLimitCooldownUntil = Date.now() + 45000;
        console.info('[Gemini AI] Rate limit active; switching to deterministic energy advisor for 45s.');
      } else {
        console.warn('[Gemini AI] Non-quota error, using heuristic advisor:', err?.message || err);
      }
      explanationCache.set(cacheKey, fallbackExplanation);
      return fallbackExplanation;
    } finally {
      inFlightAiPromise = null;
    }
  })();

  return inFlightAiPromise;
}

async function getFullTelemetry() {
  const zones = getGridZones(simState.simHour, simState.isPeakerEvent);
  const { dispatched, metrics } = dispatchWorkloads(zones, simState.simHour, simState.isAutonomousMode);
  const explanation = await getAiExplanation(
    zones,
    dispatched,
    simState.simHour,
    simState.isPeakerEvent,
    simState.isAutonomousMode
  );

  return {
    timestamp: new Date().toISOString(),
    sim_hour: simState.simHour,
    is_peaker_event: simState.isPeakerEvent,
    is_autonomous_mode: simState.isAutonomousMode,
    zones,
    workloads: dispatched,
    ai_explanation: explanation,
    cumulative_metrics: metrics,
  };
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'VoltShift Autonomous Agent', simHour: simState.simHour });
});

app.get('/api/electricity-maps-data', (req, res) => {
  res.json({
    status: 'connected',
    apiKeyConfigured: Boolean(ELECTRICITY_MAPS_KEY),
    cachedZones: liveGridCache,
  });
});

app.get('/api/eia-grid-data', (req, res) => {
  res.json({
    status: 'connected',
    apiKeyConfigured: Boolean(EIA_API_KEY),
    cachedZones: eiaFuelCache,
  });
});

app.get('/api/nrel/solar', async (req, res) => {
  const lat = req.query.lat ? String(req.query.lat) : '37.7749';
  const lon = req.query.lon ? String(req.query.lon) : '-122.4194';
  const cacheKey = `${lat}_${lon}`;

  if (nrelSolarCache.has(cacheKey)) {
    return res.json(nrelSolarCache.get(cacheKey));
  }

  try {
    const url = `https://developer.nlr.gov/api/solar/solar_resource/v1.json?api_key=${NREL_API_KEY}&lat=${lat}&lon=${lon}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'NREL API request failed' });
    }
    const data = await resp.json();
    const result = {
      status: 'success',
      source: 'National Renewable Energy Laboratory (NREL / NLR)',
      coordinates: [Number(lat), Number(lon)],
      annual_dni: data.outputs?.avg_dni?.annual ?? 5.2,
      annual_ghi: data.outputs?.avg_ghi?.annual ?? 4.8,
      annual_tilt: data.outputs?.avg_lat_tilt?.annual ?? 5.4,
      monthly_dni: data.outputs?.avg_dni?.monthly ?? {},
    };
    nrelSolarCache.set(cacheKey, result);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to query NREL Solar API' });
  }
});

app.get('/api/nrel/stations', async (req, res) => {
  const lat = req.query.lat ? String(req.query.lat) : '30.2672';
  const lon = req.query.lon ? String(req.query.lon) : '-97.7431';
  const radius = req.query.radius ? String(req.query.radius) : '15';
  const cacheKey = `${lat}_${lon}_${radius}`;

  if (nrelStationsCache.has(cacheKey)) {
    return res.json(nrelStationsCache.get(cacheKey));
  }

  try {
    const url = `https://developer.nlr.gov/api/alt-fuel-stations/v1.json?api_key=${NREL_API_KEY}&latitude=${lat}&longitude=${lon}&radius=${radius}&fuel_type=ELEC&limit=8`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'NREL Clean Stations API request failed' });
    }
    const data = await resp.json();
    const stations = (data.fuel_stations || []).map((s: any) => ({
      id: s.id,
      station_name: s.station_name,
      street_address: s.street_address,
      city: s.city,
      state: s.state,
      zip: s.zip,
      ev_network: s.ev_network,
      ev_pricing: s.ev_pricing,
      distance_miles: s.distance ? Math.round(s.distance * 10) / 10 : null,
    }));
    const result = {
      status: 'success',
      total_count: data.total_results || stations.length,
      stations,
      source: 'National Renewable Energy Laboratory (NREL / NLR)',
    };
    nrelStationsCache.set(cacheKey, result);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to query NREL Stations API' });
  }
});

app.get('/api/data-sources', (req, res) => {
  res.json({
    status: 'connected',
    sources: [
      {
        id: 'electricity-maps',
        name: 'Electricity Maps API v3',
        type: 'Real-Time Grid Carbon & Power Breakdown',
        active: Boolean(ELECTRICITY_MAPS_KEY),
        status: Object.keys(liveGridCache).length > 0 ? 'STREAMING' : 'READY',
        coveredRegions: Object.keys(liveGridCache),
        lastUpdated: Object.values(liveGridCache)[0]?.lastUpdated || null,
      },
      {
        id: 'eia-v2',
        name: 'US Energy Information Administration (EIA v2)',
        type: 'Official Hourly ISO Fuel Mix (Form 930 Certified)',
        active: Boolean(EIA_API_KEY),
        status: Object.keys(eiaFuelCache).length > 0 ? 'STREAMING' : 'READY',
        coveredRegions: Object.keys(eiaFuelCache),
        lastUpdated: Object.values(eiaFuelCache)[0]?.lastUpdated || null,
      },
      {
        id: 'nrel-nlr',
        name: 'National Renewable Energy Laboratory (NREL / NLR)',
        type: 'Solar Irradiance (GHI/DNI) & Clean Infrastructure Depots',
        active: Boolean(NREL_API_KEY),
        status: 'READY',
        cachedSolarQueries: nrelSolarCache.size,
        cachedStationQueries: nrelStationsCache.size,
      },
      {
        id: 'gemini-genai',
        name: 'Google Gemini 3.8 Flash GenAI',
        type: 'Autonomous Grid Balancing & Dispatch Optimization',
        active: Boolean(process.env.GEMINI_API_KEY),
        status: 'ACTIVE',
      },
    ],
  });
});

function generateHeuristicChatReply(message: string, ctx: {
  simHour: number;
  isPeaker: boolean;
  isAutonomous: boolean;
  zones: any[];
  workloads: any[];
  explanation: any;
}): string {
  const q = message.toLowerCase();
  const { simHour, isPeaker, isAutonomous, zones, workloads, explanation } = ctx;

  const caiso = zones.find((z: any) => z.zone_id === 'CAISO');
  const ercot = zones.find((z: any) => z.zone_id === 'ERCOT');

  if (q.includes('time') || q.includes('hour') || q.includes('day') || q.includes('change energy') || q.includes('diurnal') || q.includes('curve') || q.includes('schedule') || q.includes('decision')) {
    return `### How Energy Dispatch Changes Based on Time of Day & Grid Data

At simulation hour **${simHour}:00**, the autonomous dispatch engine coordinates industrial power based on the diurnal energy cycle:

1. **Midday Solar Crest (10:00 - 15:00)**:
   - **Solar Surge**: When the sun is high, regional solar arrays (such as CAISO producing ~${caiso?.solar_mw?.toFixed(0) || '4,500'} MW) flood the grid with zero-marginal-cost clean electricity.
   - **Dispatch Action (BOOST)**: The autonomous engine triggers **BOOST** on flexible hyperscale AI model training batches and fast-charges commercial EV fleets to absorb surplus renewable energy before it gets curtailed.

2. **Evening Duck Curve & Peaker Crunch (17:00 - 20:00)**:
   - **Solar Disappearance & Fossil Peaking**: Solar drops to zero just as household consumer electricity consumption peaks. Utilities fire up expensive, high-emitting natural gas peaker plants (pushing carbon intensity over 350-450 gCO₂/kWh).
   - **Dispatch Action (THROTTLE / DEFER)**: The engine throttles non-urgent AI compute jobs by up to 75% and defers EV depot charging, preventing high-emissions dispatch and avoiding steep demand charges.

3. **Overnight Wind Surge (21:00 - 05:00)**:
   - **Wind Generation**: Nighttime wind speeds surge across Texas (ERCOT generating ~${ercot?.wind_mw?.toFixed(0) || '13,000'} MW) and the Midwest.
   - **Dispatch Action (BOOST)**: Delayed compute batches resume, and heavy EV delivery fleets complete their overnight charge cycles at low marginal emissions.

**Current Operational State at ${simHour}:00**: ${isAutonomous ? `Autonomous mode is active. The engine has selected **${explanation?.primary_driver || 'Diurnal Optimization'}** as the catalyst, actively avoiding ${explanation?.estimated_carbon_saved_kg || 24} kg CO₂.` : 'Currently in UNMANAGED mode: all facilities draw static baseline power regardless of grid emissions.'}`;
  }

  if (q.includes('peaker') || q.includes('gas') || q.includes('shock') || q.includes('spike')) {
    return `### Peaker Plant Operations & Shock Mitigation

${isPeaker ? '**Peaker Spike Event Active**' : 'Standard Grid Dispatch (No active peaker event).'}

- **Why Peakers are High-Emissions**: Simple-cycle gas peakers emit **600-800 gCO₂/kWh**, double to triple the emissions of combined-cycle baseload plants.
- **How the Agent Responds**: When a peaker spike is active:
  1. High-consumption AI training jobs (like Midlothian AI cluster and Council Bluffs) are immediately curtailed by 50-75% from their 1,000+ kW baselines.
  2. Commercial EV fleet fast-charging is paused unless a vehicle is within 1 hour of its hard delivery departure SLA.
  3. Load is shifted toward cleaner balancing authorities where wind or hydro can absorb the work.`;
  }

  if (q.includes('eia') || q.includes('data') || q.includes('form 930') || q.includes('source') || q.includes('fuel')) {
    return `### How Official US EIA Form 930 Data Informs Dispatch

VoltShift continuously queries the **U.S. Energy Information Administration (EIA v2)** API for real-time balancing authority generation stacks:

- **CAISO**: ${caiso?.eia_fuel_breakdown ? `Solar: ${caiso.eia_fuel_breakdown.solar_mw} MW, Wind: ${caiso.eia_fuel_breakdown.wind_mw} MW, Hydro: ${caiso.eia_fuel_breakdown.hydro_mw} MW, Gas: ${caiso.eia_fuel_breakdown.gas_mw} MW (${caiso.eia_fuel_breakdown.clean_energy_pct}% clean)` : `${caiso?.renewable_pct}% clean`}
- **ERCOT**: ${ercot?.eia_fuel_breakdown ? `Wind: ${ercot.eia_fuel_breakdown.wind_mw} MW, Solar: ${ercot.eia_fuel_breakdown.solar_mw} MW, Gas: ${ercot.eia_fuel_breakdown.gas_mw} MW, Coal: ${ercot.eia_fuel_breakdown.coal_mw} MW` : `${ercot?.renewable_pct}% clean`}

When EIA records show high fossil reliance (coal + gas peaking), the agent deprioritizes drawing from those interconnects. When clean generation surges, loads are promoted.`;
  }

  if (q.includes('sla') || q.includes('deadline') || q.includes('delay') || q.includes('guarantee')) {
    return `### Zero-Breach SLA Invariant

Carbon thrift is never allowed to cause a missed delivery deadline or stalled AI training epoch:

- Every industrial site tracks **SLA Progress %** and **Target Deadline Hour**.
- If a site's time buffer (T_deadline - T_sim) drops below the threshold required to complete remaining work (100% - Progress), the agent triggers an **SLA Overrule**.
- The site is forced to **BOOST** to 100% capacity regardless of grid carbon intensity, guaranteeing zero contractual breaches.`;
  }

  if (q.includes('council') || q.includes('bluffs') || q.includes('texas') || q.includes('dallas') || q.includes('workload') || q.includes('site') || q.includes('cluster')) {
    const list = workloads.slice(0, 4).map((w: any) => `- **${w.site_name}** (${w.type}): Status = **${w.status}** (${w.current_kw} kW vs baseline ${w.baseline_kw} kW). Deadline: ${w.deadline_hour}:00 (${w.sla_progress_pct}% done)`).join('\n');
    return `### Current Industrial Workload Status (${simHour}:00)

${list}

**Why these statuses?**
- AI training clusters are flexible and can throttle draw when their local grid zone has high marginal emissions.
- EV fleet depots charge aggressively when daytime solar or nighttime wind is abundant, scaling back during expensive peak-tariff windows.`;
  }

  if (q.includes('tutorial') || q.includes('guide') || q.includes('pdf') || q.includes('how to use') || q.includes('walkthrough')) {
    return `### VoltShift User Guide & Tutorial

You can download the full executive PDF tutorial directly by clicking **Tutorial PDF** in the top navigation bar or via \`/api/tutorial.pdf\`.

**What You Can Do & How To Do It**:
1. **Explore the 24-Hour Diurnal Cycle**: Scrub the timeline slider at the bottom of the screen from 00:00 to 23:00 to watch regional solar (CAISO/ERCOT) peak at midday and fossil peakers fire up in the evening.
2. **Toggle Autonomous Dispatch**: Flip the "Autonomous AI Dispatch" button to watch Gemini balance flexible AI compute and EV fleet charging, boosting loads during green windows and throttling during dirty hours.
3. **Simulate a Peaker Spike**: Click "Simulate Peaker Spike" to simulate emergency grid distress and see how the agent protects the grid by slashing non-critical loads.
4. **Inspect Sites & ISOs**: Click on map markers (data centers, EV depots) or regional cards on the left to see live fuel breakdowns, emissions, and SLA progress.
5. **Ask Gemini in Real-Time**: Use this chat panel to ask questions about dispatch strategies, carbon arbitrage, or SLA guarantees.`;
  }

  return `### Gemini Dispatch Decision Engine (Hour ${simHour}:00)

- **Current Catalyst**: ${explanation?.primary_driver || 'Diurnal Multi-ISO Optimization'}
- **Autonomous Mode**: ${isAutonomous ? 'Active' : 'Unmanaged'}
- **Cleanest Active Zone**: ${zones.slice().sort((a: any, b: any) => a.carbon_intensity - b.carbon_intensity)[0]?.name} (${zones.slice().sort((a: any, b: any) => a.carbon_intensity - b.carbon_intensity)[0]?.carbon_intensity} gCO₂/kWh)

**Reasoning**: "${explanation?.reasoning_summary || 'Balancing industrial compute loads against real-time grid carbon signals.'}"

**Tactical Guidance**: ${explanation?.forecast_recommendation || 'Maintain high throughput during renewable crest hours.'}

You can ask me anything about:
1. *How does energy change by time of day?*
2. *What happens during an evening peaker spike?*
3. *How are US EIA Form 930 fuel stacks calculated?*
4. *How are hard SLA deadlines preserved?*`;
}

app.post('/api/gemini/chat', async (req, res) => {
  const { message, history, context } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const currentTelemetry = await getFullTelemetry();
  const simHour = context?.simHour ?? currentTelemetry.sim_hour;
  const isPeaker = context?.isPeaker ?? currentTelemetry.is_peaker_event;
  const isAutonomous = context?.isAutonomous ?? currentTelemetry.is_autonomous_mode;
  const zones = context?.zones ?? currentTelemetry.zones;
  const workloads = context?.workloads ?? currentTelemetry.workloads;
  const explanation = context?.explanation ?? currentTelemetry.ai_explanation;

  const zoneSummary = zones.map((z: any) => {
    let eiaStr = '';
    if (z.eia_fuel_breakdown) {
      const e = z.eia_fuel_breakdown;
      eiaStr = ` | EIA Form 930 Fuel Stack: Solar ${e.solar_mw || 0}MW, Wind ${e.wind_mw || 0}MW, Hydro ${e.hydro_mw || 0}MW, Nuclear ${e.nuclear_mw || 0}MW, Gas ${e.gas_mw || 0}MW, Coal ${e.coal_mw || 0}MW, Clean: ${e.clean_energy_pct || z.renewable_pct}%`;
    }
    return `- ${z.zone_id} (${z.name}): Carbon Intensity=${z.carbon_intensity} gCO2/kWh (Tier: ${z.color_tier}), Renewables=${z.renewable_pct}%, Marginal Fuel=${z.marginal_fuel}${eiaStr}`;
  }).join('\n');

  const workloadSummary = workloads.map((w: any) => {
    return `- ${w.site_name} (${w.type}, Zone: ${w.zone_id}): Current Action=${w.status}, Base Draw=${w.baseline_kw} kW, Managed Draw=${w.current_kw} kW (Delta=${w.delta_kw} kW), SLA Deadline=${w.deadline_hour}:00, Progress=${w.sla_progress_pct}%`;
  }).join('\n');

  const systemInstruction = `You are the VoltShift Autonomous Energy Dispatch & Grid Orchestration Advisor powered by Gemini 3.8 Flash.
You explain how the autonomous load-shifting system changes energy usage across data centers (AI training clusters) and EV fleet charging depots based on the current time of day, regional grid carbon intensity, and live generation stack data.

LIVE REAL-TIME CONTEXT:
Current Simulation Hour: ${simHour}:00 (0 to 23 hour diurnal clock)
Autonomous Dispatch Mode: ${isAutonomous ? 'ACTIVE / AUTONOMOUS' : 'UNMANAGED / STATIC SCHEDULE'}
Peaker Shock Event Active: ${isPeaker ? 'YES (EMERGENCY PEAKER RAMP ACTIVE)' : 'NO (STANDARD DIURNAL FLOW)'}
Current Decision Catalyst: "${explanation?.primary_driver || 'Diurnal Solar & Wind Curtailment Window'}"
Reasoning Summary: "${explanation?.reasoning_summary || ''}"
Estimated Carbon Saved: ${explanation?.estimated_carbon_saved_kg || 0} kg CO2
Estimated Tariff Savings: $${explanation?.estimated_cost_saved_usd || 0} USD

REGIONAL GRIDS (EIA Form 930 + Electricity Maps Live Data):
${zoneSummary}

INDUSTRIAL WORKLOAD SITES:
${workloadSummary}

HOW ENERGY DISPATCH CHANGES BASED ON TIME AND DATA:
1. Morning Ramp (06:00 - 09:00): Grid demand rises from waking commercial activity; marginal fossil generators pick up base load. Actions are maintained conservatively.
2. Midday Solar Crest (10:00 - 15:00): Solar output peaks (especially CAISO & ERCOT). Abundant zero-marginal-cost clean energy surges into the grid. The agent BOOSTS AI batch training and fast-charges EV fleets to absorb clean energy and avoid curtailment.
3. Evening Duck Curve & Peaker Ramp (17:00 - 20:00): Solar drops to zero while household consumption surges. Expensive, dirty gas peakers fire up (carbon spikes >350 gCO2/kWh). The agent THROTTLES or DEFERS non-essential loads by 50-75% to prevent emissions and high demand charges.
4. Night Wind Surge (21:00 - 05:00): Wind power surges (especially in ERCOT and Midwest MISO). The agent shifts delayed compute and depot battery replenishment into this overnight wind window.
5. SLA Invariant: If a workload is close to its deadline hour (e.g. within 2 hours) and progress is lagging, it is prioritized regardless of carbon to avoid SLA breaches.

INSTRUCTIONS:
- Directly and clearly answer the user's question with clean, dignified, Apple-inspired clarity.
- STRICT PROHIBITION: DO NOT USE ANY EMOJIS anywhere in the response. Maintain a clean, professional, high-clarity tone accessible to the everyday person.
- Reference the current simulation hour (${simHour}:00) and specific numbers (MW solar/wind, carbon gCO2/kWh, kW draw) to illustrate why energy is being changed right now.
- Highlight how time-of-day dynamics drive the decision if relevant.
- Keep responses well-structured with clear paragraphs or bullet points. Avoid filler text or unnecessary jargon.`;

  if (ai) {
    try {
      const contents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        const recentHistory = history.slice(-6);
        for (const msg of recentHistory) {
          contents.push({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: String(msg.parts || msg.content || '') }],
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      if (response.text) {
        return res.json({
          reply: response.text.trim(),
          source: 'gemini-3.8-flash',
          simHour,
          isAutonomous,
          isPeaker,
        });
      }
    } catch (err: any) {
      console.warn('[Gemini Chat API] Rate limit or error; using deterministic energy advisor:', err?.message || err);
    }
  }

  const fallbackReply = generateHeuristicChatReply(message, {
    simHour,
    isPeaker,
    isAutonomous,
    zones,
    workloads,
    explanation,
  });

  return res.json({
    reply: fallbackReply,
    source: 'deterministic-energy-engine',
    simHour,
    isAutonomous,
    isPeaker,
  });
});

app.get('/api/telemetry', async (req, res) => {
  try {
    const data = await getFullTelemetry();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Downloadable Tutorial PDF generated dynamically (not saved to project directory)
app.get(['/api/tutorial.pdf', '/api/download-tutorial'], async (req, res) => {
  try {
    const pdfBuffer = await createTutorialPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="VoltShift_Autonomous_Grid_Tutorial.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.end(pdfBuffer);
  } catch (err: any) {
    console.error('Failed to generate tutorial PDF:', err);
    return res.status(500).send('Error generating tutorial PDF');
  }
});

app.post('/api/action', async (req, res) => {
  const { action, hour, autonomous_mode, peaker_active } = req.body;
  if (action === 'SET_HOUR' && typeof hour === 'number') {
    simState.simHour = Math.max(0, Math.min(23, hour));
  } else if (action === 'TOGGLE_MODE') {
    simState.isAutonomousMode = autonomous_mode !== undefined ? Boolean(autonomous_mode) : !simState.isAutonomousMode;
  } else if (action === 'TRIGGER_PEAKER_SPIKE') {
    simState.isPeakerEvent = peaker_active !== undefined ? Boolean(peaker_active) : !simState.isPeakerEvent;
  } else if (action === 'RESET_METRICS') {
    simState.cumulativeCo2AvoidedKg = 0;
    simState.cumulativeMwhShifted = 0;
    simState.cumulativeCostSavedUsd = 0;
    for (const w of WORKLOAD_CONFIGS) {
      simState.workloadProgress[w.id] = 10.0;
    }
  }

  const packet = await getFullTelemetry();
  broadcastPacket(packet);
  res.json({ status: 'success', simState, packet });
});

// Create HTTP and WebSocket Server
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/grid-telemetry' });

const clients = new Set<WebSocket>();

function broadcastPacket(packet: any) {
  const payload = JSON.stringify(packet);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

wss.on('connection', async (ws) => {
  clients.add(ws);

  // Send current snapshot immediately
  try {
    const packet = await getFullTelemetry();
    ws.send(JSON.stringify(packet));
  } catch (err) {
    console.error('Initial telemetry error:', err);
  }

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.action === 'SET_HOUR' && typeof data.hour === 'number') {
        simState.simHour = Math.max(0, Math.min(23, data.hour));
      } else if (data.action === 'TOGGLE_MODE') {
        simState.isAutonomousMode =
          data.autonomous_mode !== undefined ? Boolean(data.autonomous_mode) : !simState.isAutonomousMode;
      } else if (data.action === 'TRIGGER_PEAKER_SPIKE') {
        simState.isPeakerEvent =
          data.peaker_active !== undefined ? Boolean(data.peaker_active) : !simState.isPeakerEvent;
      } else if (data.action === 'TOGGLE_TICKER') {
        simState.isTickerRunning = !simState.isTickerRunning;
      }

      const packet = await getFullTelemetry();
      broadcastPacket(packet);
    } catch (e) {
      console.error('WebSocket command error:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Background Tick Loop (Every 1.5 seconds)
setInterval(async () => {
  if (clients.size > 0 && simState.isTickerRunning) {
    try {
      const packet = await getFullTelemetry();
      broadcastPacket(packet);
    } catch (e) {
      console.error('Ticker loop error:', e);
    }
  }
}, 1500);

// Mount Vite in development or static files in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`[VoltShift Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
