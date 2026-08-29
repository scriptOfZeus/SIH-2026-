"""
Generate SYNTHETIC booking demand data for the SIH-2026 Cooperative Gig Platform.

⚠️  This data is SYNTHETIC — generated for demo/development purposes only.
    It does NOT represent real booking history.

Output : data/synthetic_bookings.csv  (~7 300 rows)
Covers : 4 regions × 5 service categories × ~394 days (2025-08-01 → 2026-08-28)
"""

import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

REGIONS = ["Kolkata", "Mumbai", "Delhi", "Bengaluru"]
CATEGORIES = ["electrician", "plumber", "cleaner", "carpenter", "painter"]

# Average daily bookings per category (reflects relative popularity)
BASE_DEMAND = {
    "electrician": 15,
    "plumber": 12,
    "cleaner": 18,
    "carpenter": 8,
    "painter": 6,
}

# City-size / activity multiplier
REGION_MULTIPLIER = {
    "Kolkata": 1.0,
    "Mumbai": 1.4,
    "Delhi": 1.3,
    "Bengaluru": 1.2,
}


def generate_dataset(output_path=None):
    if output_path is None:
        output_path = Path(__file__).parent / "data" / "synthetic_bookings.csv"
    else:
        output_path = Path(output_path)

    output_path.parent.mkdir(parents=True, exist_ok=True)

    start_date = datetime(2025, 8, 1)
    end_date = datetime(2026, 8, 28)
    dates = pd.date_range(start=start_date, end=end_date, freq="D")

    np.random.seed(42)
    rows = []

    for region in REGIONS:
        for category in CATEGORIES:
            base = BASE_DEMAND[category] * REGION_MULTIPLIER[region]

            for date in dates:
                # ── weekly seasonality ──
                dow = date.dayofweek
                if dow == 6:          # Sunday
                    weekly = 0.55
                elif dow == 5:        # Saturday
                    weekly = 0.70
                else:                 # Mon-Fri, slight mid-week peak
                    weekly = 1.0 + 0.05 * (2 - abs(dow - 2))

                # ── monthly / seasonal ──
                month = date.month
                if month in (10, 11):                          # Diwali / festival
                    seasonal = 1.35
                elif month in (4, 5):                          # Pre-monsoon, construction
                    seasonal = (1.25 if category in ("carpenter", "painter", "electrician")
                                else 1.10)
                elif month in (6, 7, 8):                       # Monsoon
                    if category == "plumber":
                        seasonal = 1.50
                    elif category == "electrician":
                        seasonal = 1.20
                    else:
                        seasonal = 0.80
                elif month in (12, 1, 2):                      # Winter
                    seasonal = 0.90
                else:
                    seasonal = 1.0

                # ── gradual upward trend ──
                days_elapsed = (date - start_date).days
                trend = 1.0 + 0.0004 * days_elapsed

                # ── noise ──
                expected = base * weekly * seasonal * trend
                noise = np.random.normal(0, max(1, expected * 0.12))
                demand = max(0, int(round(expected + noise)))

                rows.append({
                    "ds": date.strftime("%Y-%m-%d"),
                    "region": region,
                    "skill_category": category,
                    "y": demand,
                })

    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)

    print(f"[OK] Generated {len(df):,} rows -> {output_path}")
    print(f"   Date range : {dates[0].date()} -> {dates[-1].date()} ({len(dates)} days)")
    print(f"   Regions    : {REGIONS}")
    print(f"   Categories : {CATEGORIES}")
    print(f"   [NOTICE] SYNTHETIC data - for demo/development only.")
    return df


if __name__ == "__main__":
    generate_dataset()
