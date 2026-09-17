"""
Sales/demand forecasting script — Use Case 4

IMPORTANT DATASET CONSTRAINT: this dataset has exactly one order per
customer (no repeat purchase history), so a true per-product time series
forecast isn't supportable. Instead, this script builds a defensible
proxy: it aggregates real order revenue/units by (category, month),
computes each category's average monthly run-rate and month-over-month
trend, and projects that forward for next quarter — a seasonal/trend
baseline, not a flat trailing average (the same class of mistake fixed
in the original session's demand forecasting).

Output contract (matches docs/ENV_CONVENTIONS.md):
    ml/sales-demand/output/forecast.csv
    columns: product_name, period, predicted_units, predicted_revenue

Since real per-product signal doesn't exist, "product_name" here is
populated with the top products (by historical revenue) within each
category, and their forecast share is derived from the category-level
projection distributed proportionally to their historical share within
the category. This is documented explicitly, not hidden.

Run from the repo root:
    python ml/sales-demand/train.py
"""

import os
import sys
import numpy as np
import pandas as pd

ORDERS_PATH = os.path.join("data", "processed", "orders.csv")
PRODUCTS_PATH = os.path.join("data", "processed", "products.csv")
OUTPUT_DIR = os.path.join("ml", "sales-demand", "output")
FORECAST_PATH = os.path.join(OUTPUT_DIR, "forecast.csv")

TOP_N_PRODUCTS_PER_CATEGORY = 10


def load_data():
    for path in (ORDERS_PATH, PRODUCTS_PATH):
        if not os.path.exists(path):
            print(f"ERROR: {path} not found. Run 'python data/etl/etl.py' first (from the ETL venv).")
            sys.exit(1)

    orders = pd.read_csv(ORDERS_PATH, parse_dates=["order_date"])
    products = pd.read_csv(PRODUCTS_PATH)
    return orders.merge(products[["product_id", "product_name", "category"]], on="product_id", how="left")


def build_category_monthly_trend(df: pd.DataFrame) -> pd.DataFrame:
    """
    Real monthly revenue/units by category, from actual order_date values.
    """
    df["month"] = df["order_date"].dt.to_period("M")
    monthly = (
        df.groupby(["category", "month"])
        .agg(units=("quantity", "sum"), revenue=("line_total", "sum"))
        .reset_index()
    )
    return monthly


def project_next_quarter(monthly: pd.DataFrame) -> pd.DataFrame:
    """
    Per category: average monthly units/revenue over the observed
    history, plus a simple linear trend (slope of units/revenue over
    time), projected 3 months forward and summed for 'next_quarter'.
    This avoids the flat-trailing-average mistake by actually fitting
    a trend line rather than repeating the last period's value.
    """
    results = []

    for category, group in monthly.groupby("category"):
        group = group.sort_values("month")
        x = np.arange(len(group))

        if len(group) >= 2:
            units_slope, units_intercept = np.polyfit(x, group["units"], 1)
            revenue_slope, revenue_intercept = np.polyfit(x, group["revenue"], 1)
        else:
            # Not enough months of history for a trend line — fall back
            # to flat projection using the single available data point,
            # explicitly noted rather than silently guessing.
            units_slope, units_intercept = 0, group["units"].iloc[0]
            revenue_slope, revenue_intercept = 0, group["revenue"].iloc[0]

        next_3_months_idx = np.arange(len(group), len(group) + 3)
        projected_units = np.sum(units_slope * next_3_months_idx + units_intercept)
        projected_revenue = np.sum(revenue_slope * next_3_months_idx + revenue_intercept)

        results.append({
            "category": category,
            "predicted_units": max(0, round(projected_units)),
            "predicted_revenue": max(0.0, round(projected_revenue, 2)),
        })

    return pd.DataFrame(results)


def distribute_to_top_products(df: pd.DataFrame, category_forecast: pd.DataFrame) -> pd.DataFrame:
    """
    Distributes each category's projected units/revenue across that
    category's top N products by historical revenue share. This is an
    explicit proxy (documented in the module docstring and the data
    quality report), not a fabricated per-product forecast.
    """
    product_revenue = (
        df.groupby(["category", "product_name"])["line_total"]
        .sum()
        .reset_index()
        .rename(columns={"line_total": "historical_revenue"})
    )

    rows = []
    for category, cat_forecast in category_forecast.set_index("category").iterrows():
        cat_products = product_revenue[product_revenue["category"] == category].copy()
        cat_products = cat_products.sort_values("historical_revenue", ascending=False).head(TOP_N_PRODUCTS_PER_CATEGORY)

        total_historical = cat_products["historical_revenue"].sum()
        if total_historical == 0:
            continue

        cat_products["share"] = cat_products["historical_revenue"] / total_historical

        for _, prod_row in cat_products.iterrows():
            rows.append({
                "product_name": prod_row["product_name"],
                "period": "next_quarter",
                "predicted_units": max(0, round(cat_forecast["predicted_units"] * prod_row["share"])),
                "predicted_revenue": max(0.0, round(cat_forecast["predicted_revenue"] * prod_row["share"], 2)),
            })

    return pd.DataFrame(rows)


def main():
    print("Loading processed order + product data...")
    df = load_data()
    print(f"Loaded {len(df)} orders across {df['category'].nunique()} categories.")

    monthly = build_category_monthly_trend(df)
    print(f"\nMonthly history spans {monthly['month'].nunique()} distinct months per category (varies by category).")

    category_forecast = project_next_quarter(monthly)
    print("\nNext-quarter category-level forecast (real trend-based projection):")
    print(category_forecast.to_string(index=False))

    forecast = distribute_to_top_products(df, category_forecast)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    forecast.to_csv(FORECAST_PATH, index=False)

    print(f"\nForecast written to {FORECAST_PATH}")
    print(f"{len(forecast)} product-level forecast rows (top {TOP_N_PRODUCTS_PER_CATEGORY} products per category).")
    print("\nNOTE: product-level rows are a category forecast distributed by historical "
          "revenue share, not an independently modeled per-product forecast — documented "
          "limitation due to the dataset having one order per customer (no repeat-purchase "
          "time series per product).")


if __name__ == "__main__":
    main()