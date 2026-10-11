export type ActionStatus = 'BOOST' | 'MAINTAIN' | 'THROTTLE' | 'DEFER';
export type WorkloadType = 'AI_TRAINING' | 'EV_FLEET';
export type ColorTier = 'green' | 'amber' | 'red';

export interface EiaFuelBreakdown {
  period?: string;
  respondent?: string;
  solar_mw: number;
  wind_mw: number;
  hydro_mw: number;
  nuclear_mw: number;
  gas_mw: number;
  coal_mw: number;
  geothermal_mw: number;
  total_gen_mw: number;
  clean_pct: number;
  lastUpdated: string;
}

export interface NrelSolarData {
  annual_dni: number; // Direct Normal Irradiance kWh/m2/day
  annual_ghi: number; // Global Horizontal Irradiance kWh/m2/day
  annual_tilt: number; // Tilt Radiation kWh/m2/day
  location?: string;
}

export interface NrelCleanStation {
  id: number;
  station_name: string;
  street_address: string;
  city: string;
  state: string;
  ev_network?: string;
  ev_pricing?: string;
  distance_miles?: number;
}

export interface GridZone {
  zone_id: string; // e.g. 'CAISO' | 'ERCOT' | 'PJM' | 'MISO'
  name: string;
  carbon_intensity: number; // gCO2/kWh
  renewable_pct: number; // %
  solar_mw: number;
  wind_mw: number;
  coordinates: [number, number]; // [lat, lng]
  marginal_fuel?: string;
  color_tier?: ColorTier;
  is_live_api?: boolean;
  eia_fuel_breakdown?: EiaFuelBreakdown;
}

export interface IndustrialWorkload {
  id: string;
  site_name: string;
  type: WorkloadType;
  zone_id: string;
  current_kw: number;
  max_kw: number;
  baseline_kw: number;
  flexibility_score: number;
  deadline_hour: number;
  status: ActionStatus;
  coordinates: [number, number]; // [lat, lng]
  sla_progress_pct: number;
  delta_kw: number;
}

export interface HourlyForecastPoint {
  hour: number;
  carbon_intensity: number;
  renewable_pct: number;
  recommended_action: ActionStatus;
  solar_factor: number;
  wind_factor: number;
}

export interface GeminiAgentExplanation {
  primary_driver: string;
  reasoning_summary: string;
  estimated_carbon_saved_kg: number;
  estimated_cost_saved_usd: number;
  forecast_recommendation: string;
  hourly_forecast?: HourlyForecastPoint[];
}

export interface CumulativeMetrics {
  co2_avoided_kg: number;
  clean_energy_shifted_mwh: number;
  cost_savings_usd: number;
  improvement_pct: number;
  avg_carbon_managed: number;
  avg_carbon_baseline: number;
  total_active_kw: number;
}

export interface TelemetryPacket {
  timestamp: string;
  sim_hour: number;
  is_peaker_event: boolean;
  is_autonomous_mode: boolean;
  zones: GridZone[];
  workloads: IndustrialWorkload[];
  ai_explanation: GeminiAgentExplanation;
  cumulative_metrics: CumulativeMetrics;
}

export type ClientAction =
  | { action: 'SET_HOUR'; hour: number }
  | { action: 'TOGGLE_MODE'; autonomous_mode?: boolean }
  | { action: 'TRIGGER_PEAKER_SPIKE'; peaker_active?: boolean }
  | { action: 'TOGGLE_TICKER' }
  | { action: 'RESET_METRICS' };
