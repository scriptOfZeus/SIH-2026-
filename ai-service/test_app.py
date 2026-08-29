"""
Tests for the demand-forecasting API.

Run with:  python -m pytest test_app.py -v
Requires:  trained models in artifacts/models.pkl (run model.py first)
"""

import pytest
from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


# ── /health ──────────────────────────────────────────────────────────────

class TestHealth:
    def test_returns_ok(self):
        r = client.get("/health")
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "ok"
        assert isinstance(d["model_loaded"], bool)
        assert "model_type" in d
        assert "model_count" in d

    def test_models_are_loaded(self):
        d = client.get("/health").json()
        assert d["model_loaded"] is True
        assert d["model_count"] == 20  # 4 regions × 5 categories


# ── /predict — valid requests ────────────────────────────────────────────

class TestPredictValid:
    def test_single_region_category(self):
        r = client.post("/predict", json={
            "region": "Kolkata", "skill_category": "electrician",
        })
        assert r.status_code == 200
        d = r.json()
        assert len(d["forecast"]) == 7
        assert d["horizon_days"] == 7
        assert d["model"] in ("prophet", "holt_winters", "moving_average")
        assert d["data_source"] == "synthetic"
        assert "generated_at" in d

        item = d["forecast"][0]
        assert item["region"] == "Kolkata"
        assert item["skill_category"] == "electrician"
        assert item["predicted_demand"] >= 0
        assert item["lower_bound"] <= item["predicted_demand"]
        assert item["predicted_demand"] <= item["upper_bound"]

    def test_forecast_dates_are_sequential(self):
        r = client.post("/predict", json={
            "region": "Mumbai", "skill_category": "plumber",
        })
        dates = [f["date"] for f in r.json()["forecast"]]
        assert dates == sorted(dates)
        assert len(set(dates)) == 7  # all unique


# ── /predict — "all" combinations ────────────────────────────────────────

class TestPredictAll:
    def test_omitted_filters_return_all(self):
        r = client.post("/predict", json={})
        assert r.status_code == 200
        assert len(r.json()["forecast"]) == 20 * 7  # 4 × 5 × 7

    def test_explicit_all(self):
        r = client.post("/predict", json={"region": "all", "skill_category": "all"})
        assert len(r.json()["forecast"]) == 20 * 7

    def test_single_region_all_categories(self):
        r = client.post("/predict", json={"region": "Mumbai"})
        d = r.json()
        assert len(d["forecast"]) == 5 * 7
        assert all(f["region"] == "Mumbai" for f in d["forecast"])

    def test_all_regions_single_category(self):
        r = client.post("/predict", json={"skill_category": "plumber"})
        d = r.json()
        assert len(d["forecast"]) == 4 * 7
        assert all(f["skill_category"] == "plumber" for f in d["forecast"])


# ── /predict — invalid / edge cases ──────────────────────────────────────

class TestPredictInvalid:
    def test_unknown_region_returns_empty(self):
        r = client.post("/predict", json={
            "region": "Atlantis", "skill_category": "electrician",
        })
        assert r.status_code == 200
        assert r.json()["forecast"] == []

    def test_unknown_category_returns_empty(self):
        r = client.post("/predict", json={
            "region": "Kolkata", "skill_category": "astronaut",
        })
        assert r.status_code == 200
        assert r.json()["forecast"] == []

    def test_horizon_too_large(self):
        r = client.post("/predict", json={
            "region": "Kolkata", "skill_category": "electrician",
            "horizon_days": 100,
        })
        assert r.status_code == 422  # pydantic validation

    def test_horizon_zero(self):
        r = client.post("/predict", json={
            "region": "Kolkata", "skill_category": "electrician",
            "horizon_days": 0,
        })
        assert r.status_code == 422

    def test_custom_horizon(self):
        r = client.post("/predict", json={
            "region": "Delhi", "skill_category": "cleaner",
            "horizon_days": 14,
        })
        assert r.status_code == 200
        d = r.json()
        assert len(d["forecast"]) == 14
        assert d["horizon_days"] == 14


# ── model loading ────────────────────────────────────────────────────────

class TestModelLoading:
    def test_models_store_is_populated(self):
        from app import models_store
        assert models_store is not None
        assert len(models_store) == 20

    def test_every_key_has_type(self):
        from app import models_store
        for key, entry in models_store.items():
            assert "type" in entry
            assert entry["type"] in ("prophet", "holt_winters", "moving_average")
            assert "data" in entry
