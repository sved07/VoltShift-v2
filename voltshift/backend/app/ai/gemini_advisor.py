import json
from typing import List, Dict, Any, Optional
from ..config import GEMINI_API_KEY, GEMINI_MODEL
from ..models.schemas import (
    GridZone,
    IndustrialWorkload,
    GeminiAgentExplanation,
    HourlyForecastPoint,
)

class GeminiAdvisor:
    def __init__(self):
        self.client = None
        self.cache: Dict[str, GeminiAgentExplanation] = {}
        self.last_call_time: float = 0.0
        self.cooldown_until: float = 0.0
        if GEMINI_API_KEY:
            try:
                from google import genai
                self.client = genai.Client(api_key=GEMINI_API_KEY)
            except Exception as e:
                print(f"[VoltShift AI] Could not initialize google.genai client: {e}")

    def _generate_rule_based_forecast(
        self,
        zones: List[GridZone],
        current_hour: int
    ) -> List[HourlyForecastPoint]:
        forecast: List[HourlyForecastPoint] = []
        for h in range(24):
            # Midday solar curve simulation
            is_day = 8 <= h <= 18
            solar_factor = 1.0 if (11 <= h <= 15) else (0.4 if is_day else 0.0)
            wind_factor = 0.8 if (h <= 5 or h >= 21) else 0.3
            
            # Weighted average carbon across regions
            base_co2 = 230.0
            co2 = base_co2 - (solar_factor * 85.0) - (wind_factor * 40.0)
            if 17 <= h <= 20: # Evening peak demand ramp
                co2 += 95.0
            
            co2 = round(max(60.0, co2), 1)
            renew_pct = round(min(88.0, max(12.0, (1.0 - (co2 / 400.0)) * 100.0)), 1)
            
            if renew_pct > 60.0:
                rec = "BOOST"
            elif co2 > 300.0:
                rec = "THROTTLE"
            elif 17 <= h <= 20:
                rec = "DEFER"
            else:
                rec = "MAINTAIN"

            forecast.append(HourlyForecastPoint(
                hour=h,
                carbon_intensity=co2,
                renewable_pct=renew_pct,
                recommended_action=rec,
                solar_factor=solar_factor,
                wind_factor=wind_factor,
            ))
        return forecast

    def _fallback_explanation(
        self,
        zones: List[GridZone],
        workloads: List[IndustrialWorkload],
        sim_hour: int,
        is_peaker_event: bool,
        is_autonomous_mode: bool
    ) -> GeminiAgentExplanation:
        caiso = next((z for z in zones if z.zone_id == "CAISO"), None)
        ercot = next((z for z in zones if z.zone_id == "ERCOT"), None)
        pjm = next((z for z in zones if z.zone_id == "PJM"), None)

        boosted = [w for w in workloads if w.status == "BOOST"]
        throttled = [w for w in workloads if w.status in ["THROTTLE", "DEFER"]]
        
        hourly_forecast = self._generate_rule_based_forecast(zones, sim_hour)

        if is_peaker_event:
            driver = "Emergency Gas Peaker Ramp (Grid Disruption)"
            summary = (
                f"Peak fossil generation event active at {sim_hour:02d}:00. Regional carbon surged past "
                f"{ercot.carbon_intensity if ercot else 450} gCO2/kWh in ERCOT/PJM. The VoltShift autonomous agent "
                f"curtailed flexible industrial training by {sum(abs(w.delta_kw) for w in throttled):.0f} kW and "
                f"halted non-critical EV depot fast charging to prevent high-emissions marginal dispatch."
            )
            rec = "Hold non-critical compute in queue until solar dawn (07:00). Maximize battery storage export."
        elif not is_autonomous_mode:
            driver = "Unmanaged Baseline Operating Mode"
            summary = (
                f"System operating on static baseline schedules at {sim_hour:02d}:00. Workloads draw nominal rated power "
                f"regardless of grid carbon intensity ({ercot.carbon_intensity if ercot else 240} gCO2/kWh in ERCOT, "
                f"{caiso.carbon_intensity if caiso else 160} gCO2/kWh in CAISO). Switch to Autonomous Dispatch to activate carbon arbitrage."
            )
            rec = "Engage autonomous dispatch mode to capture real-time renewable curtailment credits."
        elif caiso and caiso.renewable_pct > 65.0:
            driver = "CAISO Solar Curtailment Surplus Window"
            summary = (
                f"High midday irradiance at {sim_hour:02d}:00 in California ({caiso.solar_mw:.0f} MW solar, "
                f"{caiso.carbon_intensity:.0f} gCO2/kWh). The autonomous agent surged Silicon Valley AI training clusters "
                f"and LA EV fleet charging to maximum capacity (+{sum(w.delta_kw for w in boosted if w.zone_id == 'CAISO'):.0f} kW) "
                f"to soak up negative-priced zero-carbon generation."
            )
            rec = "Pre-charge EV delivery fleets fully before the 17:00 evening solar ramp-down."
        else:
            driver = "Dynamic Diurnal Grid Arbitrage"
            summary = (
                f"Multi-ISO balancing active at {sim_hour:02d}:00. Total shifted active load is "
                f"{sum(w.current_kw for w in workloads):.0f} kW. Workloads in cleaner zones are prioritized, "
                f"while carbon-intensive industrial batches are scheduled against upcoming renewable crests."
            )
            rec = "Maintain flexible buffer on AI distributed training checkpoints ahead of anticipated wind shift."

        carbon_saved = sum(abs(w.delta_kw) * 0.1 * 0.38 for w in workloads if w.status != "MAINTAIN")
        cost_saved = sum(abs(w.delta_kw) * 0.1 * 0.09 for w in workloads if w.status != "MAINTAIN")

        return GeminiAgentExplanation(
            primary_driver=driver,
            reasoning_summary=summary,
            estimated_carbon_saved_kg=round(max(18.5, carbon_saved), 1),
            estimated_cost_saved_usd=round(max(12.4, cost_saved), 2),
            forecast_recommendation=rec,
            hourly_forecast=hourly_forecast,
        )

    async def explain_dispatch(
        self,
        zones: List[GridZone],
        workloads: List[IndustrialWorkload],
        sim_hour: int,
        is_peaker_event: bool,
        is_autonomous_mode: bool
    ) -> GeminiAgentExplanation:
        import time
        cache_key = f"{sim_hour}_{1 if is_peaker_event else 0}_{1 if is_autonomous_mode else 0}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        fallback = self._fallback_explanation(zones, workloads, sim_hour, is_peaker_event, is_autonomous_mode)
        now = time.time()

        if not self.client or now < self.cooldown_until or (now - self.last_call_time < 20.0):
            self.cache[cache_key] = fallback
            return fallback

        self.last_call_time = now
        try:
            # Build structured context for Gemini
            prompt = (
                f"You are the VoltShift Autonomous Grid Load-Shifting Agent. "
                f"Current simulation hour: {sim_hour:02d}:00. "
                f"Disruption gas peaker event: {is_peaker_event}. "
                f"Autonomous mode: {is_autonomous_mode}.\n\n"
                f"Regional Grid Status:\n"
                + "\n".join([f"- {z.zone_id} ({z.name}): {z.carbon_intensity} gCO2/kWh, {z.renewable_pct}% renewables, solar: {z.solar_mw}MW, wind: {z.wind_mw}MW, fuel: {z.marginal_fuel}" for z in zones])
                + "\n\nIndustrial Workloads Dispatched:\n"
                + "\n".join([f"- {w.site_name} ({w.type}, {w.zone_id}): status={w.status}, current={w.current_kw}kW, delta={w.delta_kw}kW, SLA deadline={w.deadline_hour}:00, progress={w.sla_progress_pct}%" for w in workloads])
                + "\n\nProvide the dispatch explanation following the GeminiAgentExplanation schema."
            )

            response = self.client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": GeminiAgentExplanation,
                    "temperature": 0.2,
                }
            )

            data = json.loads(response.text)
            if not data.get("hourly_forecast"):
                data["hourly_forecast"] = [p.model_dump() for p in self._generate_rule_based_forecast(zones, sim_hour)]
            res = GeminiAgentExplanation(**data)
            self.cache[cache_key] = res
            return res
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "Quota exceeded" in err_str:
                self.cooldown_until = now + 45.0
                print(f"[VoltShift AI] Rate limit cooldown active for 45s: {e}")
            else:
                print(f"[VoltShift AI] Inference fallback: {e}")
            self.cache[cache_key] = fallback
            return fallback
