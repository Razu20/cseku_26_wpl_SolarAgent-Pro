"""
Unit tests — site_analysis engine.

Tests are grouped by function. Each function is tested with:
  - a known-good "happy path" case with verified expected outputs
  - an edge case (unknown country, significant shading, etc.)

No mocking needed — the engine is a pure function.
"""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.engines.site_analysis import (
    estimate_resource,
    score_suitability,
    recommend_tilt_orientation,
    analyze_site,
)


# ── estimate_resource ─────────────────────────────────────────────────────────
class TestEstimateResource:
    def test_known_country_and_city(self):
        r = estimate_resource("Bangladesh", "Khulna")
        assert r["psh"] == pytest.approx(4.8)
        assert r["latitude"] == pytest.approx(22.82)
        assert r["avg_temp_c"] == 27
        assert r["tariff_usd_per_kwh"] == pytest.approx(0.075)
        assert r["is_city_level_estimate"] is True
        assert r["is_known_country"] is True

    def test_known_country_unknown_city_falls_back_to_country_default(self):
        r = estimate_resource("Bangladesh", "UnknownCity")
        assert r["psh"] == pytest.approx(4.7)   # country default
        assert r["is_city_level_estimate"] is False
        assert r["is_known_country"] is True

    def test_unknown_country_uses_global_default(self):
        r = estimate_resource("Narnia", "Somewhere")
        assert r["psh"] == pytest.approx(4.5)
        assert r["is_known_country"] is False
        assert r["is_city_level_estimate"] is False

    def test_high_irradiance_location(self):
        r = estimate_resource("Saudi Arabia", "Riyadh")
        assert r["psh"] >= 6.0

    def test_low_irradiance_location(self):
        r = estimate_resource("United Kingdom", "London")
        assert r["psh"] <= 3.0

    def test_us_phoenix_highest_psh(self):
        r = estimate_resource("United States", "Phoenix")
        assert r["psh"] == pytest.approx(6.6)

    def test_southern_hemisphere_latitude_negative(self):
        r = estimate_resource("Australia", "Sydney")
        assert r["latitude"] < 0


# ── score_suitability ─────────────────────────────────────────────────────────
class TestScoreSuitability:
    def test_excellent_conditions(self):
        s = score_suitability(psh=5.5, shading="none", roof_area_m2=200, required_area_m2=20)
        assert s["score"] >= 80
        assert s["tier"] == "Excellent"

    def test_significant_shading_lowers_score(self):
        s_none = score_suitability(5.0, "none", 100, 20)
        s_heavy = score_suitability(5.0, "significant", 100, 20)
        assert s_heavy["score"] < s_none["score"]

    def test_poor_low_irradiance(self):
        s = score_suitability(psh=2.0, shading="none", roof_area_m2=None, required_area_m2=None)
        assert s["tier"] == "Poor"

    def test_area_constraint_lowers_score(self):
        s_plenty = score_suitability(5.0, "none", 200, 20)
        s_tight = score_suitability(5.0, "none", 10, 20)
        assert s_tight["score"] < s_plenty["score"]

    def test_no_area_info_still_scores(self):
        s = score_suitability(4.8, "partial", None, None)
        assert 0 <= s["score"] <= 100
        assert s["tier"] in ["Excellent", "Good", "Moderate", "Poor"]

    def test_factors_list_present(self):
        s = score_suitability(4.8, "none", 100, 50)
        assert isinstance(s["factors"], list)
        assert len(s["factors"]) >= 2
        labels = [f["label"] for f in s["factors"]]
        assert "Sun resource" in labels
        assert "Shading" in labels

    def test_score_clamped_0_to_100(self):
        s = score_suitability(10.0, "none", 10000, 5)
        assert 0 <= s["score"] <= 100


# ── recommend_tilt_orientation ────────────────────────────────────────────────
class TestTiltOrientation:
    def test_northern_hemisphere_faces_south(self):
        t = recommend_tilt_orientation(23.8)
        assert t["orientation"] == "True South"
        assert t["tilt_degrees"] == 24

    def test_southern_hemisphere_faces_north(self):
        t = recommend_tilt_orientation(-33.87)
        assert t["orientation"] == "True North"
        assert t["tilt_degrees"] == 34

    def test_equator_zero_tilt(self):
        t = recommend_tilt_orientation(0.0)
        assert t["tilt_degrees"] == 0


# ── analyze_site (integration) ────────────────────────────────────────────────
class TestAnalyzeSite:
    def test_full_result_keys_present(self):
        result = analyze_site("Bangladesh", "Khulna", "sloped_tin", 200, "none", "shop")
        assert "resource" in result
        assert "suitability" in result
        assert "tilt_orientation" in result
        assert "country" in result

    def test_result_matches_individual_functions(self):
        result = analyze_site("India", "Delhi", "flat_concrete", 100, "partial", "house")
        resource = estimate_resource("India", "Delhi")
        assert result["resource"]["psh"] == resource["psh"]

    def test_optional_roof_area_none(self):
        result = analyze_site("Nigeria", "Lagos", "flat_concrete", None, "none", "shop")
        assert result is not None
        assert result["roof_area_m2"] is None
