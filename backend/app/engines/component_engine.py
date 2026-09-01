"""
Component recommendation engine.

Chooses a panel tier based on available roof area vs. required area, sizes
the inverter off both peak load and array size, sizes a battery bank when
storage is needed, and returns realistic balance-of-system items.

Brand names below are real, well-known manufacturers in each product
category, given as illustrative *examples* (as the project brief asks for)
— not live pricing or an endorsement, and not meant to be exhaustive.
"""
from typing import Optional

PANEL_TIERS = {
    "budget": {"type": "Polycrystalline", "wattage": 335, "efficiency": "16-17%",
               "examples": ["Jinko Eagle (poly)", "Canadian Solar HiKu (poly)"]},
    "standard": {"type": "Monocrystalline PERC", "wattage": 450, "efficiency": "20-21%",
                 "examples": ["Trina Vertex S", "LONGi Hi-MO 5"]},
    "premium": {"type": "Mono TOPCon / N-type", "wattage": 585, "efficiency": "22-23%",
                "examples": ["Jinko Tiger Neo", "JA Solar DeepBlue 4.0"]},
}

MOUNTING_BY_ROOF = {
    "flat_concrete": "Tilted mounting frame \u2014 RCC roof hooks + adjustable tilt legs (10\u201315\u00b0)",
    "sloped_tin": "Tin-roof rail mounting, hook-bolt fixed, follows existing pitch",
    "sloped_tile": "Tile-roof mounting hooks with flashing, follows existing pitch",
    "ground_mount": "Ground-mount galvanized steel structure",
}

BALANCE_OF_SYSTEM = [
    "DC solar cable, 4-6 mm\u00b2, double-insulated, UV-resistant",
    "AC cable sized to inverter output current and local code",
    "DC & AC isolators / MCBs",
    "Surge Protection Device (SPD) \u2014 DC and AC side",
    "Earthing/grounding kit for array frame and inverter chassis",
    "Combiner/junction box if more than 2 strings",
]


def _choose_panel_tier(array_kw_needed: float, roof_area_m2: Optional[float]) -> str:
    required_area_standard = array_kw_needed * 6.5  # m^2/kW including spacing, standard-tier panel
    if not roof_area_m2:
        return "standard"
    if roof_area_m2 < required_area_standard * 0.75:
        return "premium"   # space-constrained: need higher efficiency per m^2
    if roof_area_m2 > required_area_standard * 1.6:
        return "budget"    # plenty of space: no need to pay for efficiency
    return "standard"


def recommend_components(array_kw_needed: float, battery_kwh_needed: float, peak_load_w: float,
                          roof_type: str, roof_area_m2: Optional[float], system_mode: str) -> dict:
    tier = _choose_panel_tier(array_kw_needed, roof_area_m2)
    panel_spec = PANEL_TIERS[tier]
    panel_count = max(1, -(-int(array_kw_needed * 1000) // panel_spec["wattage"]))  # ceil division
    actual_array_kw = round((panel_count * panel_spec["wattage"]) / 1000, 3)
    m2_per_panel = {"premium": 2.6, "budget": 1.9}.get(tier, 2.2)
    required_area_m2 = round(panel_count * m2_per_panel)

    dc_ac_oversizing_ratio = 1.15
    inverter_kw = max((peak_load_w / 1000) * 1.25, actual_array_kw / dc_ac_oversizing_ratio)
    inverter_type = {
        "off_grid": "Off-grid inverter/charger",
        "hybrid": "Hybrid inverter (grid + battery + PV)",
        "on_grid": "Grid-tie string inverter",
    }[system_mode]
    inverter_examples = (
        ["Growatt MIN series", "Sungrow SG series"] if system_mode == "on_grid"
        else ["Deye SUN-K hybrid", "Growatt SPF hybrid", "Victron MultiPlus-II"]
    )

    battery = None
    if system_mode != "on_grid" and battery_kwh_needed > 0.1:
        battery = {
            "chemistry": "LiFePO4 (Lithium Iron Phosphate)",
            "nominal_capacity_kwh": round(battery_kwh_needed, 1),
            "recommended_voltage": "48V" if actual_array_kw > 5 else "24V",
            "examples": ["Pytes E-Box 48V", "EG4 LifePower4", "Dyness Powerbox"],
            "note": "LiFePO4 chosen for ~4,000-6,000 cycle life, safety profile, and no maintenance vs. flooded lead-acid.",
        }

    charge_controller = None
    if system_mode == "off_grid":
        charge_controller = {
            "type": "MPPT",
            "note": "Often integrated into the off-grid/hybrid inverter; shown separately only if using a standalone charge controller.",
        }

    return {
        "tier": tier,
        "panel": {**panel_spec, "count": panel_count, "actual_array_kw": actual_array_kw, "required_area_m2": required_area_m2},
        "inverter": {"type": inverter_type, "size_kw": round(inverter_kw, 2), "examples": inverter_examples},
        "battery": battery,
        "charge_controller": charge_controller,
        "mounting": MOUNTING_BY_ROOF.get(roof_type, MOUNTING_BY_ROOF["ground_mount"]),
        "balance_of_system": BALANCE_OF_SYSTEM,
        "configuration": system_mode,
    }
