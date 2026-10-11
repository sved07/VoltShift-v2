import math
import json
from pathlib import Path
from typing import Dict, List, Optional
import httpx
from ..config import ELECTRICITY_MAPS_KEY
from ..models.schemas import GridZone

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "mock_iso_telemetry.json"

class GridMonitor:
    def __init__(self):
        with open(DATA_FILE, "r") as f:
            self.raw_data = json.load(f)
        self.zone_configs = self.raw_data["zones"]

    def _calculate_solar_mw(self, zone_cfg: dict, hour: int) -> float:
        peak_hour = zone_cfg["solar_peak_hour"]
        max_mw = zone_cfg["solar_max_mw"]
        if hour < 6 or hour > 19:
            return 0.0
        # Normal-like bell curve for daylight hours
        val = math.sin((hour - 6) / 13.0 * math.pi)
        if val < 0:
            return 0.0
        return round(val * max_mw, 1)

    def _calculate_wind_mw(self, zone_cfg: dict, hour: int) -> float:
        peak_hour = zone_cfg["wind_peak_hour"]
        max_mw = zone_cfg["wind_max_mw"]
        # Wind often peaks at night/evening and dips midday
        dist = abs(hour - peak_hour)
        if dist > 12:
            dist = 24 - dist
        factor = 0.4 + 0.6 * math.cos(dist / 12.0 * math.pi * 0.5)
        return round(factor * max_mw, 1)

    def get_grid_state(self, hour: int, peaker_active: bool = False) -> List[GridZone]:
        zones: List[GridZone] = []

        for zone_id, cfg in self.zone_configs.items():
            solar_mw = self._calculate_solar_mw(cfg, hour)
            wind_mw = self._calculate_wind_mw(cfg, hour)
            fossil_base = cfg["fossil_base_mw"]

            total_renewable = solar_mw + wind_mw
            total_gen = total_renewable + fossil_base
            renewable_pct = min(100.0, max(5.0, round((total_renewable / total_gen) * 100.0, 1)))

            # Baseline carbon calculation (inversely proportional to renewable share)
            # CAISO / ERCOT: cleaner baseline; PJM / MISO: coal/gas heavier
            raw_carbon = cfg["base_carbon"] * (1.15 - (renewable_pct / 100.0) * 0.85)

            # Peaker event shock (affects ERCOT and PJM especially)
            marginal_fuel = "Combined-Cycle Gas"
            if peaker_active and zone_id in ["ERCOT", "PJM", "MISO"]:
                raw_carbon += cfg["peaker_spike_addition"]
                marginal_fuel = "Simple-Cycle Gas Peaker / Distillate Fuel Oil"
            elif renewable_pct > 65.0:
                marginal_fuel = "Surplus Solar / Wind (Curtailment Risk)"
            elif renewable_pct > 40.0:
                marginal_fuel = "Hydro / Natural Gas"

            carbon_intensity = round(max(45.0, raw_carbon), 1)

            # Determine color tier
            if carbon_intensity < 150.0:
                color_tier = "green"
            elif carbon_intensity <= 320.0:
                color_tier = "amber"
            else:
                color_tier = "red"

            zones.append(GridZone(
                zone_id=zone_id,
                name=cfg["name"],
                carbon_intensity=carbon_intensity,
                renewable_pct=renewable_pct,
                solar_mw=solar_mw,
                wind_mw=wind_mw,
                coordinates=(cfg["coordinates"][0], cfg["coordinates"][1]),
                marginal_fuel=marginal_fuel,
                color_tier=color_tier,
            ))

        return zones

    async def fetch_live_electricity_maps(self, zone_id: str) -> Optional[dict]:
        """Optional real API client when key is configured."""
        if not ELECTRICITY_MAPS_KEY:
            return None
        zone_map = {
            "CAISO": "US-CAL-CISO",
            "ERCOT": "US-TEX-ERCO",
            "PJM": "US-MIDA-PJM",
            "MISO": "US-MIDW-MISO"
        }
        api_zone = zone_map.get(zone_id)
        if not api_zone:
            return None

        url = f"https://api.electricitymap.org/v3/carbon-intensity/latest?zone={api_zone}"
        headers = {"auth-token": ELECTRICITY_MAPS_KEY}
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
        return None
