"""
SolarAgent — the conversational layer.

Architecture: numbers are always computed by the deterministic engines in
`app/engines`, never guessed by the model. The agent's job is to decide
*when* it has enough information to call a tool, execute that tool against
real Python functions, and explain the result conversationally. This keeps
the numeric output trustworthy (same inputs always produce the same
outputs) while the conversation itself stays genuinely LLM-driven.

This is a standard Anthropic Messages API tool-use loop: call the model,
if it asks to use a tool then run the tool and feed the result back, repeat
until the model returns a plain text answer (or we hit the iteration cap).
"""
import json
from typing import Any, Dict, List

import anthropic

from . import config
from .engines import component_engine, cost_engine, energy_engine, roadmap_engine, site_analysis
from .session_store import SessionState
from .system_prompt import SYSTEM_PROMPT

TOOLS = [
    {
        "name": "estimate_site_conditions",
        "description": (
            "Estimate solar irradiance (peak sun-hours), climate, and suitability for a "
            "location and roof setup. Call once you have country, city, roof type, roof "
            "area, shading, and building type."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "country": {"type": "string"},
                "city": {"type": "string"},
                "roof_type": {"type": "string", "enum": ["flat_concrete", "sloped_tin", "sloped_tile", "ground_mount"]},
                "roof_area_m2": {"type": "number"},
                "shading": {"type": "string", "enum": ["none", "partial", "significant"]},
                "building_type": {"type": "string", "enum": ["house", "shop", "small_commercial"]},
            },
            "required": ["country", "city", "roof_type", "shading", "building_type"],
        },
    },
    {
        "name": "calculate_energy_load",
        "description": (
            "Calculate daily energy consumption (kWh/day) and peak load (W) from a list of "
            "appliances, and size the array (kW) and battery bank (kWh) for the chosen "
            "system mode. Call once the client has listed their appliances and system "
            "preference. Requires estimate_site_conditions to have been called first in "
            "this conversation."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "appliances": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "power_w": {"type": "number"},
                            "hours_per_day": {"type": "number"},
                            "quantity": {"type": "integer"},
                            "runs_simultaneously": {"type": "boolean"},
                        },
                        "required": ["name", "power_w", "hours_per_day"],
                    },
                },
                "system_mode": {"type": "string", "enum": ["on_grid", "off_grid", "hybrid"]},
                "autonomy_days": {"type": "number", "description": "Only relevant for off_grid/hybrid"},
            },
            "required": ["appliances", "system_mode"],
        },
    },
    {
        "name": "recommend_components",
        "description": (
            "Recommend exact panel count/wattage, inverter, battery bank, mounting, and "
            "balance-of-system, based on the sizing already computed. Call after "
            "calculate_energy_load."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "estimate_cost",
        "description": "Estimate installed cost range, annual savings, and payback period. Call after recommend_components.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "generate_installation_roadmap",
        "description": "Generate the step-by-step installation roadmap, safety notes, and maintenance schedule for the chosen system mode.",
        "input_schema": {"type": "object", "properties": {}},
    },
]


def _block_to_dict(block: Any) -> Dict[str, Any]:
    if block.type == "text":
        return {"type": "text", "text": block.text}
    if block.type == "tool_use":
        return {"type": "tool_use", "id": block.id, "name": block.name, "input": block.input}
    return {"type": block.type}


class SolarAgent:
    def __init__(self, api_key: str = None, model: str = None):
        self.client = anthropic.Anthropic(api_key=api_key or config.ANTHROPIC_API_KEY)
        self.model = model or config.ANTHROPIC_MODEL

    def _execute_tool(self, name: str, tool_input: Dict[str, Any], session: SessionState) -> Dict[str, Any]:
        if name == "estimate_site_conditions":
            result = site_analysis.analyze_site(
                country=tool_input["country"], city=tool_input["city"], roof_type=tool_input["roof_type"],
                roof_area_m2=tool_input.get("roof_area_m2"), shading=tool_input["shading"],
                building_type=tool_input["building_type"],
            )
            session.site = tool_input
            session.site_analysis = result
            return result

        if name == "calculate_energy_load":
            if session.site_analysis is None:
                return {"error": "Call estimate_site_conditions first \u2014 sizing needs the site's peak sun-hours."}
            load = energy_engine.calculate_load(tool_input["appliances"])
            sizing = energy_engine.size_system(
                daily_energy_kwh=load["daily_energy_kwh"], psh=session.site_analysis["resource"]["psh"],
                system_mode=tool_input["system_mode"], autonomy_days=tool_input.get("autonomy_days", 1.0),
            )
            result = {**load, **sizing, "system_mode": tool_input["system_mode"]}
            session.load_input = tool_input
            session.energy_result = result
            return result

        if name == "recommend_components":
            if session.energy_result is None or session.site_analysis is None:
                return {"error": "Call calculate_energy_load first."}
            result = component_engine.recommend_components(
                array_kw_needed=session.energy_result["array_kw_needed"],
                battery_kwh_needed=session.energy_result["battery_kwh_needed"],
                peak_load_w=session.energy_result["estimated_peak_load_w"],
                roof_type=session.site_analysis["roof_type"],
                roof_area_m2=session.site_analysis["roof_area_m2"],
                system_mode=session.energy_result["system_mode"],
            )
            # Re-score suitability now that we know the actual required roof area
            result["suitability"] = site_analysis.score_suitability(
                psh=session.site_analysis["resource"]["psh"], shading=session.site_analysis["shading"],
                roof_area_m2=session.site_analysis["roof_area_m2"], required_area_m2=result["panel"]["required_area_m2"],
            )
            session.design_result = result
            return result

        if name == "estimate_cost":
            if session.design_result is None:
                return {"error": "Call recommend_components first."}
            result = cost_engine.estimate_cost(
                actual_array_kw=session.design_result["panel"]["actual_array_kw"],
                battery_kwh=(session.design_result["battery"] or {}).get("nominal_capacity_kwh", 0),
                tier=session.design_result["tier"], country=session.site_analysis["country"],
                psh=session.site_analysis["resource"]["psh"],
                tariff_usd_per_kwh=session.site_analysis["resource"]["tariff_usd_per_kwh"],
            )
            session.cost_result = result
            return result

        if name == "generate_installation_roadmap":
            mode = session.energy_result["system_mode"] if session.energy_result else "hybrid"
            result = roadmap_engine.generate_roadmap(mode)
            session.roadmap_result = result
            return result

        return {"error": f"Unknown tool: {name}"}

    def chat(self, session: SessionState, user_message: str) -> str:
        session.history.append({"role": "user", "content": user_message})

        for _ in range(config.AGENT_MAX_TOOL_ITERATIONS):
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1500,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=session.history,
            )

            assistant_content = [_block_to_dict(b) for b in response.content]
            session.history.append({"role": "assistant", "content": assistant_content})

            if response.stop_reason != "tool_use":
                return "".join(b.text for b in response.content if b.type == "text").strip() or \
                    "I've noted that \u2014 what would you like to look at next?"

            tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
            tool_result_content = []
            for block in tool_use_blocks:
                result = self._execute_tool(block.name, block.input, session)
                tool_result_content.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result),
                })
            session.history.append({"role": "user", "content": tool_result_content})

        return "I've worked through several calculations here \u2014 let's pause so you can review what's been computed so far, then continue."


agent = SolarAgent()
