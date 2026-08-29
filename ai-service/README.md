# SIH-2026 — AI Demand Forecasting Service

Standalone Python microservice that predicts future booking demand for the
**Cooperative Gig Services Platform** admin dashboard.

> **⚠️ Data notice:** This service ships with a *synthetic* dataset generated
> for demo/development. It does **not** contain real booking history.

## Architecture

```
Node.js backend                          This service
─────────────────                        ─────────────
GET /admin/analytics/demand-forecast  →  POST /predict  (FastAPI, port 8000)
     (admin-only, JWT-protected)              ↓
                                         Trained model  (Prophet / Holt-Winters)
                                              ↓
                                         JSON forecast   ← returned to admin
```

The Node backend already has a passthrough stub in `routes/admin.js` —
**no backend changes are required**.

## Quick start

```bash
cd ai-service

# 1. Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. (Optional) Try installing Prophet for better forecasts
pip install prophet
# If this fails, the service auto-falls back to Holt-Winters (statsmodels).

# 4. Generate synthetic training data
python generate_synthetic_data.py

# 5. Train models
python model.py

# 6. Start the service
uvicorn app:app --host 0.0.0.0 --port 8000

# 7. Test
curl http://localhost:8000/health
curl -X POST http://localhost:8000/predict -H "Content-Type: application/json" -d "{\"region\":\"Kolkata\",\"skill_category\":\"electrician\"}"
```

## API reference

### `GET /health`

```json
{ "status": "ok", "model_loaded": true, "model_type": "holt_winters", "model_count": 20 }
```

### `POST /predict`

**Request body** (all fields optional):

```json
{
  "region": "Kolkata",
  "skill_category": "electrician",
  "horizon_days": 7
}
```

| Field | Default | Notes |
|---|---|---|
| `region` | `null` (all) | One of: Kolkata, Mumbai, Delhi, Bengaluru, or `"all"` |
| `skill_category` | `null` (all) | One of: electrician, plumber, cleaner, carpenter, painter, or `"all"` |
| `horizon_days` | `7` | 1–90 |

**Response:**

```json
{
  "forecast": [
    {
      "date": "2026-08-29",
      "region": "Kolkata",
      "skill_category": "electrician",
      "predicted_demand": 14,
      "lower_bound": 9,
      "upper_bound": 19
    }
  ],
  "horizon_days": 7,
  "model": "holt_winters",
  "generated_at": "2026-08-29T16:04:00+00:00",
  "data_source": "synthetic"
}
```

## Running tests

```bash
python -m pytest test_app.py -v
```

## Model selection

| Priority | Engine | When used |
|---|---|---|
| 1 | Facebook Prophet | `prophet` package installed and importable |
| 2 | Holt-Winters ETS | `statsmodels` installed (included in requirements.txt) |
| 3 | 7-day moving average | Fallback if neither library works, or < 30 data points |

The code auto-detects the best available engine at import time.
