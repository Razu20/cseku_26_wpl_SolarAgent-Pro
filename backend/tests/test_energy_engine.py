"""
Unit tests — energy_engine.

Validates the two core calculation functions:
  calculate_load()  — appliance aggregation with diversity factor
  size_system()     — peak-sun-hour array sizing and battery sizing

Expected values are pre-computed by hand from the documented formulas
in energy_engine.py (PR = 0.75, diversity = 0.70, DoD = 0.90, RTE = 0.95).
"""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.engines.energy_engine import calculate_load, size_system, PERFORMANCE_RATIO


SAMPLE_APPLIANCES = [
    {"name": "LED Bulb",    "power_w": 10,  "hours_per_day": 6,  "quantity": 6, "runs_simultaneously": True},
    {"name": "Ceiling Fan", "power_w": 75,  "hours_per_day": 8,  "quantity": 3, "runs_simultaneously": True},
    {"name": "Refrigerator","power_w": 150, "hours_per_day": 8,  "quantity": 1, "runs_simultaneously": True},
]
# Pre-computed:
#   daily Wh = (10*6*6) + (75*8*3) + (150*8*1) = 360 + 1800 + 1200 = 3360 Wh = 3.360 kWh
#   theoretical peak W = 60 + 225 + 150 = 435 W (all simultaneous)
#   coincident peak W  = 435 W  (all flagged simultaneous)
#   estimated peak W   = max(435, 435*0.70) = 435 W


class TestCalculateLoad:
    def test_daily_energy_correct(self):
        r = calculate_load(SAMPLE_APPLIANCES)
        assert r["daily_energy_kwh"] == pytest.approx(3.360, abs=0.001)

    def test_theoretical_peak_correct(self):
        r = calculate_load(SAMPLE_APPLIANCES)
        assert r["theoretical_max_load_w"] == pytest.approx(435.0)

    def test_estimated_peak_uses_coincident_when_all_simultaneous(self):
        r = calculate_load(SAMPLE_APPLIANCES)
        assert r["estimated_peak_load_w"] == pytest.approx(435.0)

    def test_diversity_factor_applied_when_not_simultaneous(self):
        appliances = [
            {"name": "A", "power_w": 1000, "hours_per_day": 4, "quantity": 1, "runs_simultaneously": False},
            {"name": "B", "power_w": 500,  "hours_per_day": 4, "quantity": 1, "runs_simultaneously": False},
        ]
        r = calculate_load(appliances)
        # coincident = 0; diversity = 1500 * 0.70 = 1050
        assert r["estimated_peak_load_w"] == pytest.approx(1050.0)

    def test_breakdown_list_length_matches_input(self):
        r = calculate_load(SAMPLE_APPLIANCES)
        assert len(r["breakdown"]) == len(SAMPLE_APPLIANCES)

    def test_single_appliance(self):
        r = calculate_load([{"name": "TV", "power_w": 100, "hours_per_day": 5,
                              "quantity": 1, "runs_simultaneously": True}])
        assert r["daily_energy_kwh"] == pytest.approx(0.5)

    def test_zero_appliances_returns_zeros(self):
        r = calculate_load([])
        assert r["daily_energy_kwh"] == 0.0
        assert r["estimated_peak_load_w"] == 0.0

    def test_quantity_multiplier(self):
        single = calculate_load([{"name": "Bulb", "power_w": 10, "hours_per_day": 5,
                                   "quantity": 1, "runs_simultaneously": True}])
        multi  = calculate_load([{"name": "Bulb", "power_w": 10, "hours_per_day": 5,
                                   "quantity": 5, "runs_simultaneously": True}])
        assert multi["daily_energy_kwh"] == pytest.approx(single["daily_energy_kwh"] * 5)


class TestSizeSystem:
    def test_on_grid_no_battery(self):
        r = size_system(daily_energy_kwh=10.0, psh=5.0, system_mode="on_grid", autonomy_days=1)
        # array = 10 / (5 * 0.75) = 2.667 kW
        assert r["array_kw_needed"] == pytest.approx(10 / (5 * PERFORMANCE_RATIO), abs=0.001)
        assert r["battery_kwh_needed"] == 0.0

    def test_hybrid_has_battery(self):
        r = size_system(daily_energy_kwh=10.0, psh=5.0, system_mode="hybrid", autonomy_days=1)
        # battery = (10 * 1) / (0.90 * 0.95) ≈ 11.70 kWh
        assert r["battery_kwh_needed"] > 0

    def test_off_grid_higher_battery_with_more_autonomy(self):
        r1 = size_system(10.0, 5.0, "off_grid", autonomy_days=1)
        r2 = size_system(10.0, 5.0, "off_grid", autonomy_days=2)
        assert r2["battery_kwh_needed"] == pytest.approx(r1["battery_kwh_needed"] * 2, abs=0.01)

    def test_higher_psh_smaller_array(self):
        r_low  = size_system(10.0, psh=3.0, system_mode="on_grid", autonomy_days=1)
        r_high = size_system(10.0, psh=6.0, system_mode="on_grid", autonomy_days=1)
        assert r_high["array_kw_needed"] < r_low["array_kw_needed"]

    def test_assumptions_dict_present(self):
        r = size_system(10.0, 5.0, "on_grid", 1)
        assert "assumptions" in r
        assert r["assumptions"]["performance_ratio"] == PERFORMANCE_RATIO

    def test_battery_sizing_formula(self):
        # battery = (daily_kwh * days) / (DoD * RTE) = (8 * 1.5) / (0.90 * 0.95) ≈ 14.04
        r = size_system(8.0, 4.8, "hybrid", autonomy_days=1.5)
        expected = (8.0 * 1.5) / (0.90 * 0.95)
        assert r["battery_kwh_needed"] == pytest.approx(expected, abs=0.01)
