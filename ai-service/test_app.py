"""
Tests for the demand-forecasting API.

Run with:  python -m pytest test_app.py -v
Requires:  trained models in artifacts/models.pkl (run model.py first)
"""

import json
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import app
from model import EVALUATION_PATH, calculate_metrics, evaluate_all

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


# ── /baselines ───────────────────────────────────────────────────────────

class TestBaselines:
    def test_returns_20_baselines(self):
        r = client.get("/baselines")
        assert r.status_code == 200
        d = r.json()
        assert d["count"] == 20
        assert len(d["baselines"]) == 20
        assert d["data_source"] == "synthetic"

        first = d["baselines"][0]
        assert "region" in first
        assert "skill_category" in first
        assert first["baseline_demand"] > 0
        assert first["historical_days"] == 393
        assert first["min_demand"] >= 0
        assert first["max_demand"] >= first["min_demand"]


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


# ── model evaluation ─────────────────────────────────────────────────────

class TestModelEvaluation:
    def test_calculate_metrics_correctness(self):
        y_true = np.array([10.0, 20.0, 30.0])
        y_pred = np.array([12.0, 18.0, 33.0])
        metrics = calculate_metrics(y_true, y_pred)

        # Expected:
        # MAE = (2 + 2 + 3) / 3 = 2.3333
        # RMSE = sqrt((4 + 4 + 9) / 3) = sqrt(17/3) = 2.3805
        # sMAPE = 200 * [2/22 + 2/38 + 3/63] / 3
        assert metrics["mae"] == 2.3333
        assert metrics["rmse"] == 2.3805
        assert metrics["smape_percent"] > 0

    def test_calculate_metrics_perfect_predictions(self):
        y_true = np.array([15, 25, 35])
        y_pred = np.array([15, 25, 35])
        metrics = calculate_metrics(y_true, y_pred)
        assert metrics["mae"] == 0.0
        assert metrics["rmse"] == 0.0
        assert metrics["smape_percent"] == 0.0

    def test_calculate_metrics_empty(self):
        metrics = calculate_metrics([], [])
        assert metrics["mae"] == 0.0
        assert metrics["rmse"] == 0.0
        assert metrics["smape_percent"] == 0.0

    def test_evaluation_report_file_validity(self):
        assert EVALUATION_PATH.exists(), f"Missing {EVALUATION_PATH}"
        with open(EVALUATION_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert data["evaluation_strategy"] == "chronological_holdout"
        assert data["holdout_days"] == 14
        assert "overall" in data
        assert "segments" in data

        overall = data["overall"]
        assert overall["total_models_evaluated"] == 20
        assert overall["mean_mae"] > 0
        assert overall["mean_rmse"] > 0
        assert overall["mean_smape_percent"] > 0
        assert overall["total_train_observations"] == 20 * (393 - 14)
        assert overall["total_test_observations"] == 20 * 14

        assert len(data["segments"]) == 20
        for seg in data["segments"]:
            assert "region" in seg
            assert "skill_category" in seg
            assert seg["train_observations"] == 393 - 14
            assert seg["test_observations"] == 14
            assert seg["mae"] >= 0
            assert seg["rmse"] >= 0
            assert seg["smape_percent"] >= 0

    def test_evaluate_all_custom_holdout(self, tmp_path):
        custom_out = tmp_path / "custom_eval.json"
        report = evaluate_all(test_days=7, output_path=custom_out)

        assert custom_out.exists()
        assert report["holdout_days"] == 7
        assert report["overall"]["total_models_evaluated"] == 20
        assert report["segments"][0]["test_observations"] == 7
        assert report["segments"][0]["train_observations"] == 393 - 7


class TestPhase5Extensions:
    def test_predict_includes_phase5_fields(self):
        resp = client.post(
            "/predict",
            json={"region": "Mumbai", "skill_category": "electrician", "horizon_days": 3},
        )
        assert resp.status_code == 200
        data = resp.json()
        forecast = data["forecast"]
        assert len(forecast) == 3
        valid_tiers = {"VERY LOW", "LOW", "NORMAL", "HIGH", "VERY HIGH"}
        for item in forecast:
            assert "classification" in item
            assert item["classification"] in valid_tiers
            assert "confidence_score" in item
            assert 0.0 <= item["confidence_score"] <= 1.0
            assert item["confidence_level"] in {"HIGH", "MEDIUM", "LOW"}
            assert "baseline_demand" in item
            assert "growth_percent" in item

    def test_explain_endpoint(self):
        resp = client.post(
            "/analytics/explain",
            json={"region": "Mumbai", "skill_category": "electrician", "horizon_days": 7},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["region"] == "Mumbai"
        assert data["skill_category"] == "electrician"
        assert data["baseline_demand"] > 0
        assert len(data["contributing_factors"]) > 0
        assert "holdout_smape_percent" in data
        assert len(data["explanation_summary"]) > 0 if "explanation_summary" in data else len(data["summary"]) > 0

    def test_explain_endpoint_all_region(self):
        resp = client.post(
            "/analytics/explain",
            json={"region": "all", "skill_category": "plumber", "horizon_days": 5},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["region"] == "all"
        assert len(data["contributing_factors"]) > 0

    def test_anomalies_endpoint_with_spike(self):
        # Normal data around 20, then sudden spike to 120
        obs = [
            {"date": f"2026-09-0{i+1}", "value": 20.0 + (i % 3)}
            for i in range(8)
        ]
        obs.append({"date": "2026-09-09", "value": 120.0})

        resp = client.post(
            "/analytics/anomalies",
            json={"observations": obs, "z_threshold": 2.0},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["anomalies_detected"] is True
        assert data["anomalies_count"] >= 1
        assert len(data["anomalies"]) >= 1
        spike = data["anomalies"][0]
        assert spike["date"] == "2026-09-09"
        assert spike["observed_value"] == 120.0
        assert spike["anomaly_type"] == "DEMAND_SPIKE"
        assert spike["severity"] == "CRITICAL"

    def test_anomalies_endpoint_normal_data(self):
        obs = [
            {"date": f"2026-09-0{i+1}", "value": 20.0 + (i % 2)}
            for i in range(7)
        ]
        resp = client.post(
            "/analytics/anomalies",
            json={"observations": obs, "z_threshold": 2.5},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["anomalies_detected"] is False
        assert data["anomalies_count"] == 0
        assert len(data["anomalies"]) == 0

