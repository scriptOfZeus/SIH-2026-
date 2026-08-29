"""
Time-series forecasting models for booking demand prediction.

Model priority:
  1. Facebook Prophet  (preferred — purpose-built for time-series with seasonality)
  2. Holt-Winters ETS  (statsmodels — solid fallback, proper time-series method)
  3. 7-day moving avg   (always available — minimal but functional)

The code auto-detects which library is installed and picks the best option.
One model is trained per (region, skill_category) combination.
"""

import logging
import warnings
from datetime import timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

# ── paths ────────────────────────────────────────────────────────────────
ARTIFACTS_DIR = Path(__file__).parent / "artifacts"
DATA_DIR = Path(__file__).parent / "data"
MODEL_PATH = ARTIFACTS_DIR / "models.pkl"
DATA_PATH = DATA_DIR / "synthetic_bookings.csv"

MIN_ROWS_FOR_MODEL = 30  # below this → moving-average fallback

# ── detect available libraries ───────────────────────────────────────────
PROPHET_AVAILABLE = False
STATSMODELS_AVAILABLE = False

try:
    from prophet import Prophet                                       # noqa: F401
    from prophet.serialize import model_from_json, model_to_json      # noqa: F401
    PROPHET_AVAILABLE = True
except ImportError:
    pass

try:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing       # noqa: F401
    STATSMODELS_AVAILABLE = True
except ImportError:
    pass


def get_model_type() -> str:
    """Return the best model engine available in this environment."""
    if PROPHET_AVAILABLE:
        return "prophet"
    if STATSMODELS_AVAILABLE:
        return "holt_winters"
    return "moving_average"


# ════════════════════════════════════════════════════════════════════════
#  PROPHET
# ════════════════════════════════════════════════════════════════════════

def _train_prophet(ts_df: pd.DataFrame):
    logging.getLogger("prophet").setLevel(logging.WARNING)
    logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        m = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode="multiplicative",
        )
        m.fit(ts_df[["ds", "y"]])
    return m


def _predict_prophet(model, horizon_days: int) -> pd.DataFrame:
    future = model.make_future_dataframe(periods=horizon_days)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        fc = model.predict(future)
    out = fc.tail(horizon_days)[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
    for c in ("yhat", "yhat_lower", "yhat_upper"):
        out[c] = out[c].clip(lower=0).round().astype(int)
    return out


# ════════════════════════════════════════════════════════════════════════
#  HOLT-WINTERS (statsmodels)
# ════════════════════════════════════════════════════════════════════════

def _train_holt_winters(ts_df: pd.DataFrame):
    ts = ts_df.copy()
    ts["ds"] = pd.to_datetime(ts["ds"])
    series = ts.set_index("ds")["y"].asfreq("D").ffill()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = ExponentialSmoothing(
            series, trend="add", seasonal="add", seasonal_periods=7,
        ).fit(optimized=True)
    return {"model": model, "residual_std": float(model.resid.std())}


def _predict_holt_winters(model_data: dict, horizon_days: int) -> pd.DataFrame:
    model = model_data["model"]
    std = model_data["residual_std"]
    fc = model.forecast(horizon_days)
    out = pd.DataFrame({
        "ds": fc.index,
        "yhat": fc.values,
        "yhat_lower": fc.values - 1.96 * std,
        "yhat_upper": fc.values + 1.96 * std,
    })
    for c in ("yhat", "yhat_lower", "yhat_upper"):
        out[c] = out[c].clip(lower=0).round().astype(int)
    return out


# ════════════════════════════════════════════════════════════════════════
#  MOVING AVERAGE (always-available fallback)
# ════════════════════════════════════════════════════════════════════════

def _train_moving_average(ts_df: pd.DataFrame):
    last_7 = ts_df.tail(7)["y"].values
    return {
        "last_values": last_7.tolist(),
        "last_date": str(pd.to_datetime(ts_df["ds"].iloc[-1]).date()),
        "mean": float(last_7.mean()),
        "std": float(last_7.std()) if len(last_7) > 1 else float(last_7.mean() * 0.2),
    }


def _predict_moving_average(data: dict, horizon_days: int) -> pd.DataFrame:
    mean_v = data["mean"]
    std_v = data["std"]
    last = pd.to_datetime(data["last_date"])
    dates = [last + timedelta(days=i + 1) for i in range(horizon_days)]
    return pd.DataFrame({
        "ds": dates,
        "yhat": [max(0, round(mean_v))] * horizon_days,
        "yhat_lower": [max(0, round(mean_v - 1.96 * std_v))] * horizon_days,
        "yhat_upper": [max(0, round(mean_v + 1.96 * std_v))] * horizon_days,
    })


# ════════════════════════════════════════════════════════════════════════
#  TRAIN / SAVE / LOAD / PREDICT
# ════════════════════════════════════════════════════════════════════════

def train_all() -> dict:
    """Train one model per (region, skill_category). Returns model dict."""
    print(f"\n[INFO] Loading data from {DATA_PATH} ...")
    df = pd.read_csv(DATA_PATH)
    df["ds"] = pd.to_datetime(df["ds"])

    model_type = get_model_type()
    print(f"[INFO] Model engine: {model_type}\n")

    models: dict = {}
    groups = list(df.groupby(["region", "skill_category"]))

    for i, ((region, category), gdf) in enumerate(groups, 1):
        key = (region, category)
        ts = gdf[["ds", "y"]].sort_values("ds").reset_index(drop=True)
        label = f"[{i}/{len(groups)}] {region} / {category} ({len(ts)} rows)"

        if len(ts) < MIN_ROWS_FOR_MODEL:
            models[key] = {"type": "moving_average", "data": _train_moving_average(ts)}
            print(f"   {label} -> moving_average (insufficient data)")
            continue

        try:
            if model_type == "prophet":
                trained = _train_prophet(ts)
                # Serialize via Prophet's own JSON method (robust across sessions)
                models[key] = {"type": "prophet", "data": model_to_json(trained)}
                print(f"   {label} -> prophet [OK]")
            elif model_type == "holt_winters":
                trained = _train_holt_winters(ts)
                models[key] = {"type": "holt_winters", "data": trained}
                print(f"   {label} -> holt_winters [OK]")
            else:
                models[key] = {"type": "moving_average", "data": _train_moving_average(ts)}
                print(f"   {label} -> moving_average [OK]")
        except Exception as exc:
            print(f"   {label} -> FAILED ({exc}), falling back to moving_average")
            models[key] = {"type": "moving_average", "data": _train_moving_average(ts)}

    _save_models(models)
    types = pd.Series([v["type"] for v in models.values()])
    print(f"\n[OK] Saved {len(models)} models -> {MODEL_PATH}")
    print(f"   Breakdown: {dict(types.value_counts())}")
    return models


def _save_models(models: dict):
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(models, MODEL_PATH)


def load_models():
    """Load serialized models and reconstitute Prophet objects if needed."""
    if not MODEL_PATH.exists():
        return None
    loaded = joblib.load(MODEL_PATH)

    # Deserialize Prophet JSON → Prophet objects
    if PROPHET_AVAILABLE:
        for key, entry in loaded.items():
            if entry["type"] == "prophet" and isinstance(entry["data"], str):
                entry["data"] = model_from_json(entry["data"])
    return loaded


def predict(models: dict, region=None, skill_category=None, horizon_days: int = 7) -> list:
    """Generate demand forecasts for the requested filters."""
    if not models:
        return []

    keys = list(models.keys())
    if region and region.lower() != "all":
        keys = [k for k in keys if k[0] == region]
    if skill_category and skill_category.lower() != "all":
        keys = [k for k in keys if k[1] == skill_category]

    forecasts = []
    for r, cat in keys:
        entry = models[(r, cat)]
        mtype, data = entry["type"], entry["data"]
        try:
            if mtype == "prophet":
                df_fc = _predict_prophet(data, horizon_days)
            elif mtype == "holt_winters":
                df_fc = _predict_holt_winters(data, horizon_days)
            else:
                df_fc = _predict_moving_average(data, horizon_days)

            for _, row in df_fc.iterrows():
                forecasts.append({
                    "date": pd.to_datetime(row["ds"]).strftime("%Y-%m-%d"),
                    "region": r,
                    "skill_category": cat,
                    "predicted_demand": int(row["yhat"]),
                    "lower_bound": int(row["yhat_lower"]),
                    "upper_bound": int(row["yhat_upper"]),
                })
        except Exception as exc:
            logging.warning("Prediction failed for (%s, %s): %s", r, cat, exc)
    return forecasts


# ── CLI entry point ──────────────────────────────────────────────────────
if __name__ == "__main__":
    train_all()
