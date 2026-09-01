"""
Cost estimation engine.

All figures are USD-equivalent, illustrative ranges for planning purposes —
never presented as a quote. A regional multiplier gives directionally
realistic numbers for lower-cost installed markets (e.g. South Asia) vs.
higher-cost markets, without pretending to track live commodity/labor
prices. Replace REGION_COST_MULT / COST_PER_WATT_USD with real supplier
quotes for anything client-facing.
"""
from typing import Optional

COST_PER_WATT_USD = {"budget": 0.50, "standard": 0.70, "premium": 0.90}  # installed, panel+inverter+BOS, excl. battery
BATTERY_COST_PER_KWH_USD = 260
REGION_COST_MULT = {
    "Bangladesh": 0.50, "India": 0.45, "Pakistan": 0.45, "Nepal": 0.50, "Sri Lanka": 0.55,
    "Nigeria": 0.60, "Kenya": 0.65, "Egypt": 0.50, "Philippines": 0.60, "Indonesia": 0.55,
}
DEFAULT_REGION_MULT = 1.0
PERFORMANCE_RATIO = 0.75  # kept in sync with energy_engine.PERFORMANCE_RATIO for annual-generation estimate


def estimate_cost(actual_array_kw: float, battery_kwh: float, tier: str, country: str,
                   psh: float, tariff_usd_per_kwh: float) -> dict:
    mult = REGION_COST_MULT.get(country, DEFAULT_REGION_MULT)
    equipment_install_cost = actual_array_kw * 1000 * COST_PER_WATT_USD[tier] * mult
    battery_cost = (battery_kwh or 0) * BATTERY_COST_PER_KWH_USD * mult
    subtotal = equipment_install_cost + battery_cost

    low = round(subtotal * 0.85)
    high = round(subtotal * 1.25)

    annual_generation_kwh = round(actual_array_kw * psh * 365 * PERFORMANCE_RATIO)
    annual_savings_usd = round(annual_generation_kwh * tariff_usd_per_kwh)
    payback_years = round(subtotal / annual_savings_usd, 1) if annual_savings_usd > 0 else None

    return {
        "currency": "USD (approximate, illustrative)",
        "installed_cost_low": low,
        "installed_cost_high": high,
        "annual_generation_kwh": annual_generation_kwh,
        "annual_savings_usd": annual_savings_usd,
        "payback_years": payback_years,
        "note": "Ranges are planning-stage estimates. Get 2-3 quotes from local licensed installers before purchasing.",
    }
