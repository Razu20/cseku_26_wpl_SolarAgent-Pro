"""
Unit tests — component_engine, cost_engine, roadmap_engine.
"""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.engines.component_engine import recommend_components
from app.engines.cost_engine import estimate_cost
from app.engines.roadmap_engine import generate_roadmap


# ─────────────────────────────────────────────────────────────────────────────
# component_engine
# ─────────────────────────────────────────────────────────────────────────────
class TestRecommendComponents:
    def _result(self, array_kw=3.0, battery_kwh=10.0, peak_w=900,
                roof_type="sloped_tin", roof_area=200, mode="hybrid"):
        return recommend_components(
            array_kw_needed=array_kw,
            battery_kwh_needed=battery_kwh,
            peak_load_w=peak_w,
            roof_type=roof_type,
            roof_area_m2=roof_area,
            system_mode=mode,
        )

    def test_result_has_required_keys(self):
        r = self._result()
        for key in ["tier", "panel", "inverter", "mounting", "balance_of_system"]:
            assert key in r

    def test_panel_count_positive(self):
        r = self._result()
        assert r["panel"]["count"] >= 1

    def test_actual_array_kw_gte_needed(self):
        r = self._result(array_kw=2.0)
        assert r["panel"]["actual_array_kw"] >= 2.0

    def test_on_grid_no_battery(self):
        r = self._result(battery_kwh=0.0, mode="on_grid")
        assert r["battery"] is None

    def test_hybrid_has_battery(self):
        r = self._result(battery_kwh=10.0, mode="hybrid")
        assert r["battery"] is not None
        assert r["battery"]["nominal_capacity_kwh"] == pytest.approx(10.0, abs=0.1)

    def test_space_constrained_uses_premium_tier(self):
        # 2 kW array, standard needs ~13 m², give only 8 m² → should pick premium
        r = recommend_components(2.0, 5.0, 800, "flat_concrete", 8, "hybrid")
        assert r["tier"] == "premium"

    def test_space_abundant_uses_budget_tier(self):
        r = recommend_components(2.0, 5.0, 800, "flat_concrete", 500, "hybrid")
        assert r["tier"] == "budget"

    def test_standard_tier_middle_ground_correct_area(self):
        # 3 kW array: standard range is 14.6-31.2 m², use 20 m²
        r = self._result(array_kw=3.0, roof_area=20)
        assert r["tier"] == "standard"

    def test_inverter_size_at_least_peak_load(self):
        r = self._result(peak_w=2000, array_kw=2.0)
        # inverter ≥ peak_w * 1.25 / 1000 = 2.5 kW
        assert r["inverter"]["size_kw"] >= 2.0

    def test_roof_mounting_correct_for_type(self):
        r_tin   = self._result(roof_type="sloped_tin")
        r_flat  = self._result(roof_type="flat_concrete")
        assert "tin" in r_tin["mounting"].lower() or "rail" in r_tin["mounting"].lower()
        assert "tilt" in r_flat["mounting"].lower() or "flat" in r_flat["mounting"].lower() or "rcc" in r_flat["mounting"].lower()

    def test_bos_list_not_empty(self):
        r = self._result()
        assert isinstance(r["balance_of_system"], list)
        assert len(r["balance_of_system"]) > 0

    def test_inverter_type_correct_for_mode(self):
        r_grid = self._result(mode="on_grid", battery_kwh=0)
        r_hyb  = self._result(mode="hybrid")
        r_off  = self._result(mode="off_grid")
        assert "grid-tie" in r_grid["inverter"]["type"].lower() or "string" in r_grid["inverter"]["type"].lower()
        assert "hybrid" in r_hyb["inverter"]["type"].lower()
        assert "off-grid" in r_off["inverter"]["type"].lower() or "off_grid" in r_off["inverter"]["type"].lower()


# ─────────────────────────────────────────────────────────────────────────────
# cost_engine
# ─────────────────────────────────────────────────────────────────────────────
class TestEstimateCost:
    def _result(self, kw=3.35, kwh=12.9, tier="budget",
                country="Bangladesh", psh=4.8, tariff=0.075):
        return estimate_cost(kw, kwh, tier, country, psh, tariff)

    def test_result_has_required_keys(self):
        r = self._result()
        for key in ["installed_cost_low", "installed_cost_high",
                    "annual_generation_kwh", "annual_savings_usd",
                    "payback_years", "note"]:
            assert key in r

    def test_low_less_than_high(self):
        r = self._result()
        assert r["installed_cost_low"] < r["installed_cost_high"]

    def test_payback_positive(self):
        r = self._result()
        assert r["payback_years"] is not None
        assert r["payback_years"] > 0

    def test_higher_tariff_shorter_payback(self):
        r_low  = self._result(tariff=0.05)
        r_high = self._result(tariff=0.30)
        assert r_high["payback_years"] < r_low["payback_years"]

    def test_premium_tier_more_expensive_than_budget(self):
        r_budget  = self._result(tier="budget")
        r_premium = self._result(tier="premium")
        assert r_premium["installed_cost_high"] > r_budget["installed_cost_high"]

    def test_regional_multiplier_reduces_cost_in_bangladesh(self):
        r_bd = self._result(country="Bangladesh")
        r_uk = estimate_cost(3.35, 12.9, "budget", "United Kingdom", 4.8, 0.075)
        assert r_bd["installed_cost_high"] < r_uk["installed_cost_high"]

    def test_annual_generation_formula(self):
        r = self._result(kw=5.0, psh=5.0)
        # array_kw * psh * 365 * 0.75 = 5 * 5 * 365 * 0.75 = 6843.75
        assert r["annual_generation_kwh"] == pytest.approx(6844, abs=5)

    def test_no_battery_reduces_cost(self):
        r_batt   = self._result(kwh=12.0)
        r_no_bat = self._result(kwh=0.0)
        assert r_no_bat["installed_cost_high"] < r_batt["installed_cost_high"]


# ─────────────────────────────────────────────────────────────────────────────
# roadmap_engine
# ─────────────────────────────────────────────────────────────────────────────
class TestGenerateRoadmap:
    def test_all_seven_phases_present(self):
        r = generate_roadmap("hybrid")
        assert len(r["phases"]) == 7

    def test_phase_structure(self):
        r = generate_roadmap("on_grid")
        phase = r["phases"][0]
        assert "phase" in phase
        assert "items" in phase
        assert len(phase["items"]) >= 1

    def test_safety_notes_not_empty(self):
        r = generate_roadmap("off_grid")
        assert isinstance(r["safety_notes"], list)
        assert len(r["safety_notes"]) >= 1

    def test_maintenance_schedule_present(self):
        r = generate_roadmap("hybrid")
        assert "maintenance_schedule" in r
        assert len(r["maintenance_schedule"]) >= 1

    def test_common_mistakes_present(self):
        r = generate_roadmap("on_grid")
        assert "common_mistakes" in r

    def test_on_grid_approval_item_mentions_net_metering(self):
        r = generate_roadmap("on_grid")
        design_phase = r["phases"][1]
        combined = " ".join(design_phase["items"]).lower()
        assert "net-meter" in combined or "net meter" in combined or "interconnection" in combined

    def test_off_grid_approval_item_mentions_autonomy(self):
        r = generate_roadmap("off_grid")
        design_phase = r["phases"][1]
        combined = " ".join(design_phase["items"]).lower()
        assert "autonomy" in combined or "battery" in combined
