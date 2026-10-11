from typing import List, Literal, Tuple, Dict, Any, Optional
from pydantic import BaseModel, Field

class GridZone(BaseModel):
    zone_id: str = Field(..., description="Unique ISO identifier e.g. ERCOT, CAISO, PJM, MISO")
    name: str = Field(..., description="Full regional grid operator name")
    carbon_intensity: float = Field(..., description="Real-time carbon intensity in gCO2/kWh")
    renewable_pct: float = Field(..., description="Renewable generation share percentage (0-100)")
    solar_mw: float = Field(..., description="Active solar generation in MW")
    wind_mw: float = Field(..., description="Active wind generation in MW")
    coordinates: Tuple[float, float] = Field(..., description="Geographic centroid (latitude, longitude)")
    marginal_fuel: Optional[str] = Field("Natural Gas", description="Primary marginal fuel setting carbon price")
    color_tier: Optional[str] = Field("green", description="Green (<150), Amber (150-320), Red (>320)")

class IndustrialWorkload(BaseModel):
    id: str = Field(..., description="Workload facility identifier")
    site_name: str = Field(..., description="Human-readable facility name")
    type: Literal["AI_TRAINING", "EV_FLEET"] = Field(..., description="Industrial workload category")
    zone_id: str = Field(..., description="Connected ISO grid zone")
    current_kw: float = Field(..., description="Dispatched electrical draw in kW")
    max_kw: float = Field(..., description="Peak rated power capacity in kW")
    baseline_kw: float = Field(..., description="Unmanaged baseline draw in kW")
    flexibility_score: float = Field(..., ge=0.0, le=1.0, description="Flexibility index (0 rigid, 1 fully shiftable)")
    deadline_hour: int = Field(..., ge=0, le=23, description="SLA deadline hour (00:00 - 23:00)")
    status: Literal["BOOST", "MAINTAIN", "THROTTLE", "DEFER"] = Field(..., description="Autonomous dispatch action")
    coordinates: Tuple[float, float] = Field(..., description="Coordinates [latitude, longitude]")
    sla_progress_pct: float = Field(..., ge=0.0, le=100.0, description="Percentage of daily batch/charging quota met")
    delta_kw: float = Field(0.0, description="Shifted power delta vs baseline (positive = boost, negative = throttled)")

class HourlyForecastPoint(BaseModel):
    hour: int
    carbon_intensity: float
    renewable_pct: float
    recommended_action: Literal["BOOST", "MAINTAIN", "THROTTLE", "DEFER"]
    solar_factor: float
    wind_factor: float

class GeminiAgentExplanation(BaseModel):
    primary_driver: str = Field(..., description="Primary grid or SLA driver, e.g. Solar Curtailment Window, Gas Peaker Spike")
    reasoning_summary: str = Field(..., description="Clear natural-language explanation of dispatch decisions")
    estimated_carbon_saved_kg: float = Field(..., description="Estimated carbon emissions avoided in kg CO2")
    estimated_cost_saved_usd: float = Field(..., description="Estimated peak demand and tariff cost savings in USD")
    forecast_recommendation: str = Field(..., description="Forward 24-hour tactical suggestion for load operators")
    hourly_forecast: Optional[List[HourlyForecastPoint]] = Field(default_factory=list, description="Forward 24-hour projected curve")

class CumulativeMetrics(BaseModel):
    co2_avoided_kg: float = Field(0.0, description="Cumulative avoided emissions in kg CO2")
    clean_energy_shifted_mwh: float = Field(0.0, description="Total electrical energy redirected into clean windows in MWh")
    cost_savings_usd: float = Field(0.0, description="Cumulative savings in USD")
    improvement_pct: float = Field(0.0, description="Carbon reduction percentage vs unmanaged baseline")
    avg_carbon_managed: float = Field(0.0, description="Weighted carbon intensity under autonomous management (gCO2/kWh)")
    avg_carbon_baseline: float = Field(0.0, description="Baseline unmanaged carbon intensity (gCO2/kWh)")
    total_active_kw: float = Field(0.0, description="Total currently dispatched power across all sites")

class TelemetryPacket(BaseModel):
    timestamp: str
    sim_hour: int = Field(..., ge=0, le=23)
    is_peaker_event: bool = False
    is_autonomous_mode: bool = True
    zones: List[GridZone]
    workloads: List[IndustrialWorkload]
    ai_explanation: GeminiAgentExplanation
    cumulative_metrics: CumulativeMetrics

class ClientActionMessage(BaseModel):
    action: Literal["SET_HOUR", "TOGGLE_MODE", "TRIGGER_PEAKER_SPIKE", "RESET_METRICS"]
    hour: Optional[int] = None
    autonomous_mode: Optional[bool] = None
    peaker_active: Optional[bool] = None
