"""
Site analysis engine.

Estimates solar resource (peak sun-hours), average temperature, and a rough
electricity tariff for a location, then scores overall suitability.

The REGIONS table below is a documented estimation model — the "mock
realistic data" the project brief explicitly allows for — not a live feed.
See README.md > "Adding real weather APIs" for how to swap this for
PVGIS / Solcast / OpenWeather without touching any other engine, since every
downstream calculation only depends on the four fields this function
returns (psh, lat, temp_c, tariff_usd_per_kwh).
"""
from typing import Optional, TypedDict

REGIONS = {
    "Bangladesh": {"lat": 23.8, "default_psh": 4.7, "temp_c": 27, "tariff_usd": 0.075, "cities": {
        "Dhaka": {"psh": 4.7, "lat": 23.81}, "Chattogram": {"psh": 4.6, "lat": 22.36},
        "Khulna": {"psh": 4.8, "lat": 22.82}, "Rajshahi": {"psh": 4.9, "lat": 24.37},
        "Sylhet": {"psh": 4.3, "lat": 24.90}, "Barisal": {"psh": 4.6, "lat": 22.70},
        "Rangpur": {"psh": 4.8, "lat": 25.75}, "Mymensingh": {"psh": 4.6, "lat": 24.75},
        "Cox's Bazar": {"psh": 4.7, "lat": 21.45},
    }},
    "India": {"lat": 22, "default_psh": 5.1, "temp_c": 28, "tariff_usd": 0.09, "cities": {
        "Delhi": {"psh": 5.2, "lat": 28.6}, "Mumbai": {"psh": 5.0, "lat": 19.07},
        "Bangalore": {"psh": 5.3, "lat": 12.97}, "Kolkata": {"psh": 4.7, "lat": 22.57},
        "Chennai": {"psh": 5.4, "lat": 13.08}, "Jaipur": {"psh": 5.6, "lat": 26.91},
    }},
    "Pakistan": {"lat": 30, "default_psh": 5.2, "temp_c": 27, "tariff_usd": 0.08, "cities": {
        "Karachi": {"psh": 5.4, "lat": 24.86}, "Lahore": {"psh": 5.2, "lat": 31.55},
        "Islamabad": {"psh": 5.0, "lat": 33.68},
    }},
    "Nepal": {"lat": 28, "default_psh": 4.6, "temp_c": 20, "tariff_usd": 0.08, "cities": {"Kathmandu": {"psh": 4.6, "lat": 27.7}}},
    "Sri Lanka": {"lat": 7.9, "default_psh": 4.5, "temp_c": 28, "tariff_usd": 0.10, "cities": {"Colombo": {"psh": 4.5, "lat": 6.93}}},
    "UAE": {"lat": 24, "default_psh": 5.8, "temp_c": 30, "tariff_usd": 0.08, "cities": {
        "Dubai": {"psh": 5.8, "lat": 25.2}, "Abu Dhabi": {"psh": 5.9, "lat": 24.45},
    }},
    "Saudi Arabia": {"lat": 24, "default_psh": 6.0, "temp_c": 30, "tariff_usd": 0.05, "cities": {
        "Riyadh": {"psh": 6.0, "lat": 24.7}, "Jeddah": {"psh": 6.1, "lat": 21.5},
    }},
    "United States": {"lat": 38, "default_psh": 4.5, "temp_c": 18, "tariff_usd": 0.16, "cities": {
        "New York": {"psh": 4.2, "lat": 40.7}, "Los Angeles": {"psh": 5.4, "lat": 34.05},
        "Phoenix": {"psh": 6.6, "lat": 33.45}, "Chicago": {"psh": 4.0, "lat": 41.88},
        "Houston": {"psh": 4.9, "lat": 29.76}, "Miami": {"psh": 5.1, "lat": 25.76},
        "Seattle": {"psh": 3.4, "lat": 47.6},
    }},
    "United Kingdom": {"lat": 52, "default_psh": 2.9, "temp_c": 12, "tariff_usd": 0.28, "cities": {"London": {"psh": 2.9, "lat": 51.5}}},
    "Germany": {"lat": 51, "default_psh": 3.0, "temp_c": 11, "tariff_usd": 0.35, "cities": {
        "Berlin": {"psh": 3.0, "lat": 52.5}, "Munich": {"psh": 3.2, "lat": 48.14},
    }},
    "Australia": {"lat": -27, "default_psh": 4.8, "temp_c": 21, "tariff_usd": 0.28, "cities": {
        "Sydney": {"psh": 4.6, "lat": -33.87}, "Melbourne": {"psh": 4.2, "lat": -37.81}, "Perth": {"psh": 5.5, "lat": -31.95},
    }},
    "Nigeria": {"lat": 9, "default_psh": 4.6, "temp_c": 29, "tariff_usd": 0.06, "cities": {"Lagos": {"psh": 4.4, "lat": 6.5}}},
    "Kenya": {"lat": -1, "default_psh": 5.3, "temp_c": 23, "tariff_usd": 0.15, "cities": {"Nairobi": {"psh": 5.3, "lat": -1.29}}},
    "Egypt": {"lat": 26, "default_psh": 6.0, "temp_c": 25, "tariff_usd": 0.04, "cities": {"Cairo": {"psh": 6.0, "lat": 30.04}}},
    "Philippines": {"lat": 13, "default_psh": 4.5, "temp_c": 28, "tariff_usd": 0.17, "cities": {"Manila": {"psh": 4.5, "lat": 14.6}}},
    "Indonesia": {"lat": -2, "default_psh": 4.3, "temp_c": 27, "tariff_usd": 0.08, "cities": {"Jakarta": {"psh": 4.2, "lat": -6.2}}},
}
DEFAULT_REGION = {"lat": 15, "default_psh": 4.5, "temp_c": 25, "tariff_usd": 0.12, "cities": {}}

# m^2 of roof required per kW of array, including inter-row spacing / walkways
M2_PER_KW = 6.5


def estimate_resource(country: str, city: str) -> dict:
    """Look up (or fall back to a regional default for) peak sun-hours, latitude,
    average temperature, and an approximate USD/kWh tariff for a location."""
    region = REGIONS.get(country, DEFAULT_REGION)
    city_data = region["cities"].get(city)
    psh = city_data["psh"] if city_data else region["default_psh"]
    lat = city_data["lat"] if city_data else region["lat"]
    return {
        "psh": psh,
        "latitude": lat,
        "avg_temp_c": region["temp_c"],
        "tariff_usd_per_kwh": region["tariff_usd"],
        "is_city_level_estimate": city_data is not None,
        "is_known_country": country in REGIONS,
    }


def score_suitability(psh: float, shading: str, roof_area_m2: Optional[float], required_area_m2: Optional[float]) -> dict:
    """0-100 suitability score plus the contributing factors, so the client
    (or the agent explaining it) can see exactly what drove the number."""
    base = 100 if psh >= 5.5 else 85 if psh >= 4.5 else 65 if psh >= 3.5 else 40 if psh >= 2.5 else 20
    shade_mult = {"none": 1.0, "partial": 0.75, "significant": 0.45}.get(shading, 1.0)

    factors = [
        {"label": "Sun resource", "detail": f"{psh:.1f} peak sun-hours/day", "ok": psh >= 4},
        {"label": "Shading", "detail": {
            "none": "Clear / unshaded", "partial": "Partial shading present", "significant": "Significant shading present",
        }.get(shading, shading), "ok": shading == "none"},
    ]

    area_mult = 1.0
    if roof_area_m2 and required_area_m2:
        ratio = roof_area_m2 / required_area_m2
        area_mult = 1.0 if ratio >= 1.2 else 0.95 if ratio >= 0.9 else 0.8 if ratio >= 0.6 else 0.55
        factors.append({
            "label": "Roof area",
            "detail": f"{roof_area_m2:g} m\u00b2 available vs ~{required_area_m2:g} m\u00b2 needed",
            "ok": ratio >= 0.9,
        })

    score = max(5, min(100, round(base * shade_mult * area_mult)))
    tier = "Excellent" if score >= 80 else "Good" if score >= 60 else "Moderate" if score >= 40 else "Poor"
    return {"score": score, "tier": tier, "factors": factors}


def recommend_tilt_orientation(latitude: float) -> dict:
    """Simplified, standard rule of thumb: fixed-tilt annual-optimal angle
    ~= |latitude|; face the equator (south in the northern hemisphere)."""
    return {
        "tilt_degrees": round(abs(latitude)),
        "orientation": "True South" if latitude >= 0 else "True North",
    }


def analyze_site(country: str, city: str, roof_type: str, roof_area_m2: Optional[float],
                  shading: str, building_type: str) -> dict:
    """Top-level entry point used by both the direct REST endpoint and the
    agent's `estimate_site_conditions` tool."""
    resource = estimate_resource(country, city)
    tilt = recommend_tilt_orientation(resource["latitude"])
    # Suitability needs a required-area figure, which really depends on the
    # system size (computed later in energy_engine + component_engine). At
    # this stage we score against sun-resource and shading only, and the
    # caller re-scores with the real required area once sizing is known
    # (see main.py `/load` endpoint, which calls score_suitability again).
    suitability = score_suitability(resource["psh"], shading, roof_area_m2, None)
    return {
        "country": country,
        "city": city,
        "roof_type": roof_type,
        "roof_area_m2": roof_area_m2,
        "shading": shading,
        "building_type": building_type,
        "resource": resource,
        "tilt_orientation": tilt,
        "suitability": suitability,
    }
