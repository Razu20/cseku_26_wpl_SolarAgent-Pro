"""
Load calculation and system sizing.

These are standard preliminary-design formulas used across the industry for
quick sizing before a full engineering review — not arbitrary numbers:

- Array size = daily kWh need / (peak sun-hours x performance ratio)
- Peak load = greater of (loads explicitly marked simultaneous) or
  (theoretical max x diversity factor), since real buildings rarely run
  every appliance at once
- Battery = (daily kWh x autonomy days) / (depth-of-discharge x round-trip
  efficiency)
"""
from typing import List, Literal

PERFORMANCE_RATIO = 0.75   # inverter + wiring + soiling + temperature + mismatch losses, compounded
DIVERSITY_FACTOR = 0.70    # fraction of connected load assumed coincident for peak estimate
BATTERY_DOD = 0.90         # LiFePO4 usable depth of discharge
BATTERY_ROUND_TRIP_EFF = 0.95


def calculate_load(appliances: List[dict]) -> dict:
    """appliances: [{name, power_w, hours_per_day, quantity, runs_simultaneously}]"""
    total_wh = 0.0
    theoretical_peak_w = 0.0
    coincident_peak_w = 0.0
    breakdown = []

    for a in appliances:
        qty = a.get("quantity", 1)
        wh = a["power_w"] * a["hours_per_day"] * qty
        w = a["power_w"] * qty
        total_wh += wh
        theoretical_peak_w += w
        if a.get("runs_simultaneously", True):
            coincident_peak_w += w
        breakdown.append({"name": a["name"], "daily_wh": round(wh, 1), "connected_w": w})

    estimated_peak_w = max(coincident_peak_w, theoretical_peak_w * DIVERSITY_FACTOR)

    return {
        "daily_energy_kwh": round(total_wh / 1000, 3),
        "theoretical_max_load_w": round(theoretical_peak_w, 1),
        "estimated_peak_load_w": round(estimated_peak_w, 1),
        "breakdown": breakdown,
    }


def size_system(daily_energy_kwh: float, psh: float,
                 system_mode: Literal["on_grid", "off_grid", "hybrid"],
                 autonomy_days: float) -> dict:
    array_kw_needed = daily_energy_kwh / (psh * PERFORMANCE_RATIO)

    battery_kwh_needed = 0.0
    if system_mode != "on_grid":
        battery_kwh_needed = (daily_energy_kwh * autonomy_days) / (BATTERY_DOD * BATTERY_ROUND_TRIP_EFF)

    return {
        "array_kw_needed": round(array_kw_needed, 3),
        "battery_kwh_needed": round(battery_kwh_needed, 3),
        "assumptions": {
            "performance_ratio": PERFORMANCE_RATIO,
            "diversity_factor": DIVERSITY_FACTOR,
            "battery_dod": BATTERY_DOD,
            "battery_round_trip_efficiency": BATTERY_ROUND_TRIP_EFF,
        },
    }
