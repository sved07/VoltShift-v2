from typing import List, Dict, Tuple
from ..models.schemas import GridZone, IndustrialWorkload, CumulativeMetrics
from .workload_manager import WorkloadManager

class DispatchAgent:
    def __init__(self, workload_manager: WorkloadManager):
        self.workload_manager = workload_manager
        self.cumulative_co2_saved = 4120.0 # start with established demonstration baseline
        self.cumulative_mwh_shifted = 18.6
        self.cumulative_cost_saved = 2840.0

    def dispatch(
        self,
        zones: List[GridZone],
        sim_hour: int,
        is_autonomous_mode: bool = True
    ) -> Tuple[List[IndustrialWorkload], CumulativeMetrics]:
        zone_map: Dict[str, GridZone] = {z.zone_id: z for z in zones}
        workload_configs = self.workload_manager.get_initial_workloads()
        dispatched: List[IndustrialWorkload] = []

        total_active_kw = 0.0
        total_baseline_kw = 0.0
        step_co2_managed = 0.0
        step_co2_baseline = 0.0
        step_clean_shifted_kwh = 0.0
        step_cost_delta = 0.0

        for item in workload_configs:
            wid = item["id"]
            zone = zone_map.get(item["zone_id"])
            if not zone:
                continue

            baseline_kw = item["baseline_kw"]
            max_kw = item["max_kw"]
            flexibility = item["flexibility_score"]
            deadline_hour = item["deadline_hour"]
            current_progress = self.workload_manager.get_progress(wid)

            # Hours remaining until SLA deadline
            hours_to_deadline = (deadline_hour - sim_hour) % 24
            if hours_to_deadline == 0 and current_progress < 95.0:
                hours_to_deadline = 24 # wrap-around buffer

            # Check if SLA deadline is imminent and workload needs completion
            sla_critical = (hours_to_deadline <= 3 and current_progress < 85.0)

            if not is_autonomous_mode:
                # Unmanaged baseline: run at nominal flat load
                target_kw = baseline_kw
                status = "MAINTAIN"
                delta_kw = 0.0
            else:
                # Autonomous optimization agent
                if sla_critical:
                    # SLA deadline enforcement overrides curtailment: must dispatch to finish
                    target_kw = max_kw
                    status = "BOOST"
                elif zone.renewable_pct >= 60.0 or zone.carbon_intensity < 180.0:
                    # Clean green window: boost workload to absorb abundant renewables
                    boost_factor = 0.7 + (zone.renewable_pct / 100.0) * 0.3
                    target_kw = round(baseline_kw + (max_kw - baseline_kw) * boost_factor, 1)
                    target_kw = min(max_kw, target_kw)
                    status = "BOOST"
                    step_clean_shifted_kwh += (target_kw - baseline_kw)
                elif zone.carbon_intensity > 350.0:
                    if flexibility >= 0.7:
                        # High flexibility during high-emissions window: DEFER or severe THROTTLE
                        if hours_to_deadline > 5:
                            target_kw = round(baseline_kw * 0.15, 1) # low idle power
                            status = "DEFER"
                        else:
                            target_kw = round(baseline_kw * 0.40, 1)
                            status = "THROTTLE"
                    else:
                        # Moderate flexibility: throttle 40-60%
                        target_kw = round(baseline_kw * (1.0 - flexibility * 0.55), 1)
                        status = "THROTTLE"
                elif zone.carbon_intensity > 240.0 and flexibility >= 0.8:
                    # Moderate carbon peak: throttle mildly
                    target_kw = round(baseline_kw * 0.70, 1)
                    status = "THROTTLE"
                else:
                    # Nominal grid state: maintain standard schedule
                    target_kw = baseline_kw
                    status = "MAINTAIN"

                delta_kw = round(target_kw - baseline_kw, 1)

            # Update progress tracker
            self.workload_manager.update_sla_progress(wid, target_kw, hours_step=0.1)
            updated_progress = self.workload_manager.get_progress(wid)

            # Carbon math: (kW * 0.1 hr * gCO2/kWh) / 1000 = kg CO2 in this 6-minute simulation slice
            slice_hours = 0.1
            managed_kg = (target_kw * slice_hours * zone.carbon_intensity) / 1000.0
            baseline_kg = (baseline_kw * slice_hours * zone.carbon_intensity) / 1000.0
            step_co2_managed += managed_kg
            step_co2_baseline += baseline_kg

            # Cost math: Peak demand tariff ($0.22/kWh peak fossil vs $0.06/kWh off-peak clean solar)
            if zone.carbon_intensity > 300:
                tariff_rate = 0.24 # $/kWh high marginal peaker price
            elif zone.carbon_intensity < 180:
                tariff_rate = 0.05 # $/kWh surplus green energy
            else:
                tariff_rate = 0.12 # $/kWh normal rate

            cost_managed = (target_kw * slice_hours) * tariff_rate
            cost_baseline = (baseline_kw * slice_hours) * 0.15
            step_cost_delta += max(0.0, cost_baseline - cost_managed)

            total_active_kw += target_kw
            total_baseline_kw += baseline_kw

            dispatched.append(IndustrialWorkload(
                id=wid,
                site_name=item["site_name"],
                type=item["type"],
                zone_id=item["zone_id"],
                current_kw=target_kw,
                max_kw=max_kw,
                baseline_kw=baseline_kw,
                flexibility_score=flexibility,
                deadline_hour=deadline_hour,
                status=status,
                coordinates=(item["coordinates"][0], item["coordinates"][1]),
                sla_progress_pct=updated_progress,
                delta_kw=delta_kw,
            ))

        # Accumulate metrics
        avoided_co2_step = max(0.0, step_co2_baseline - step_co2_managed)
        if is_autonomous_mode:
            self.cumulative_co2_saved += avoided_co2_step
            self.cumulative_mwh_shifted += (step_clean_shifted_kwh * 0.1) / 1000.0
            self.cumulative_cost_saved += step_cost_delta

        avg_carbon_managed = (
            sum(w.current_kw * zone_map[w.zone_id].carbon_intensity for w in dispatched) / max(1.0, total_active_kw)
        )
        avg_carbon_baseline = (
            sum(w.baseline_kw * zone_map[w.zone_id].carbon_intensity for w in dispatched) / max(1.0, total_baseline_kw)
        )

        improvement_pct = 0.0
        if avg_carbon_baseline > 0:
            improvement_pct = round(((avg_carbon_baseline - avg_carbon_managed) / avg_carbon_baseline) * 100.0, 1)

        metrics = CumulativeMetrics(
            co2_avoided_kg=round(self.cumulative_co2_saved, 1),
            clean_energy_shifted_mwh=round(self.cumulative_mwh_shifted, 2),
            cost_savings_usd=round(self.cumulative_cost_saved, 2),
            improvement_pct=improvement_pct if is_autonomous_mode else 0.0,
            avg_carbon_managed=round(avg_carbon_managed, 1),
            avg_carbon_baseline=round(avg_carbon_baseline, 1),
            total_active_kw=round(total_active_kw, 1),
        )

        return dispatched, metrics
