import json
from pathlib import Path
from typing import List, Dict
from ..models.schemas import IndustrialWorkload

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "mock_iso_telemetry.json"

class WorkloadManager:
    def __init__(self):
        with open(DATA_FILE, "r") as f:
            self.raw_data = json.load(f)
        self.workload_templates = self.raw_data["workloads"]
        self.workload_states: Dict[str, dict] = {}
        self.reset_states()

    def reset_states(self):
        self.workload_states = {}
        for w in self.workload_templates:
            self.workload_states[w["id"]] = {
                "sla_progress_pct": 35.0, # starting daily progress
                "accumulated_kwh": 0.0,
            }

    def get_initial_workloads(self) -> List[dict]:
        return self.workload_templates

    def update_sla_progress(self, workload_id: str, delivered_kw: float, hours_step: float = 0.5):
        state = self.workload_states.get(workload_id)
        if not state:
            return
        # Increase SLA progress proportionally to delivered kW vs expected nominal
        # A full day's target is roughly max_kw * 12 equivalent hours
        progress_increment = (delivered_kw * hours_step) / 180.0
        new_progress = min(100.0, state["sla_progress_pct"] + progress_increment)
        state["sla_progress_pct"] = round(new_progress, 1)
        state["accumulated_kwh"] += delivered_kw * hours_step

    def get_progress(self, workload_id: str) -> float:
        return self.workload_states.get(workload_id, {}).get("sla_progress_pct", 50.0)
