"""
Demand Forecasting API — SIH-2026 Cooperative Gig Platform.

FastAPI microservice serving booking demand predictions.
Called by the Node.js backend via POST /predict.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from model import (
    detect_anomalies,
    explain_forecast,
    get_historical_baselines,
    get_model_type,
    load_models,
    predict,
)

# ── global model store (loaded once at startup) ─────────────────────────
models_store = load_models()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global models_store
    if models_store is None:
        models_store = load_models()
    if models_store:
        print(f"[OK] Loaded {len(models_store)} forecast models ({get_model_type()} engine)")
    else:
        print("[WARN] No trained models found - run `python model.py` first")
    yield


app = FastAPI(
    title="SIH-2026 Demand Forecast Service",
    description="Serves booking demand predictions, explainability, and anomaly detection for the Cooperative Gig Platform admin dashboard.",
    version="2.0.0",
    lifespan=lifespan,
)


# ── request / response schemas ───────────────────────────────────────────

class PredictRequest(BaseModel):
    region: Optional[str] = Field(
        default=None,
        description="Region filter. Omit or pass 'all' for every region.",
        examples=["Kolkata", "all"],
    )
    skill_category: Optional[str] = Field(
        default=None,
        description="Skill category filter. Omit or pass 'all' for every category.",
        examples=["electrician", "all"],
    )
    horizon_days: Optional[int] = Field(
        default=7, ge=1, le=90,
        description="Number of days to forecast (1–90).",
    )


class ForecastItem(BaseModel):
    date: str
    day_name: Optional[str] = None
    region: str
    skill_category: str
    predicted_demand: int
    lower_bound: int
    upper_bound: int
    baseline_demand: Optional[float] = None
    growth_percent: Optional[float] = None
    classification: Optional[str] = None
    confidence_score: Optional[float] = None
    confidence_level: Optional[str] = None


class PredictResponse(BaseModel):
    forecast: List[ForecastItem]
    horizon_days: int
    model: str
    generated_at: str
    data_source: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_type: str
    model_count: int


class BaselineItem(BaseModel):
    region: str
    skill_category: str
    baseline_demand: float
    historical_days: int
    min_demand: int
    max_demand: int


class BaselinesResponse(BaseModel):
    baselines: List[BaselineItem]
    count: int
    data_source: str


class ExplainRequest(BaseModel):
    region: str = Field(..., examples=["Kolkata"])
    skill_category: str = Field(..., examples=["electrician"])
    horizon_days: Optional[int] = Field(default=7, ge=1, le=90)


class ExplainResponse(BaseModel):
    region: str
    skill_category: str
    baseline_demand: float
    confidence_score: float
    confidence_level: str
    holdout_smape_percent: Optional[float] = None
    holdout_mae: Optional[float] = None
    holdout_rmse: Optional[float] = None
    model_metrics: dict
    contributing_factors: List[str]
    summary: str


class AnomalyObservation(BaseModel):
    date: str
    value: float
    expected: Optional[float] = None


class AnomalyRequest(BaseModel):
    observations: List[AnomalyObservation]
    z_threshold: Optional[float] = 2.0


class AnomalyItem(BaseModel):
    date: str
    observed_value: float
    expected_baseline: float
    z_score: float
    deviation_percent: float
    anomaly_type: str
    severity: str
    description: str


class AnomalyResponse(BaseModel):
    anomalies_detected: bool
    anomalies_count: int
    anomalies: List[AnomalyItem]


# ── endpoints ────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health():
    """Liveness / readiness probe."""
    return HealthResponse(
        status="ok",
        model_loaded=models_store is not None,
        model_type=get_model_type(),
        model_count=len(models_store) if models_store else 0,
    )


@app.get("/baselines", response_model=BaselinesResponse)
def get_baselines():
    """Return historical average demand baselines per region and category."""
    items = get_historical_baselines()
    return BaselinesResponse(
        baselines=items,
        count=len(items),
        data_source="synthetic",
    )


@app.post("/predict", response_model=PredictResponse)
def predict_demand(req: PredictRequest):
    """Return demand forecast for the requested region / skill_category."""
    if models_store is None:
        raise HTTPException(
            status_code=503,
            detail="Models not loaded. Train first with: python model.py",
        )

    horizon = req.horizon_days if req.horizon_days is not None else 7
    forecasts = predict(
        models_store,
        region=req.region,
        skill_category=req.skill_category,
        horizon_days=horizon,
    )

    return PredictResponse(
        forecast=forecasts,
        horizon_days=horizon,
        model=get_model_type(),
        generated_at=datetime.now(timezone.utc).isoformat(),
        data_source="synthetic",
    )


@app.post("/analytics/explain", response_model=ExplainResponse)
def explain_forecast_endpoint(req: ExplainRequest):
    """Deconstruct forecast into contributing factors, holdout accuracy, and confidence."""
    horizon = req.horizon_days if req.horizon_days is not None else 7
    explanation = explain_forecast(req.region, req.skill_category, horizon)
    return ExplainResponse(**explanation)


@app.post("/analytics/anomalies", response_model=AnomalyResponse)
def detect_anomalies_endpoint(req: AnomalyRequest):
    """Statistically detect anomaly spikes/drops across input time-series data."""
    raw_obs = [obs.model_dump() for obs in req.observations]
    detected = detect_anomalies(raw_obs)
    return AnomalyResponse(
        anomalies_detected=len(detected) > 0,
        anomalies_count=len(detected),
        anomalies=detected,
    )
