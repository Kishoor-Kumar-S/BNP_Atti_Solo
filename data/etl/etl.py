"""
ETL script — Use Case 4 (Customer Churn Prediction & Sales Forecasting)

Reads the raw e-commerce dataset and splits it into three canonical CSVs
that Backend, Churn ML, and Sales ML all consume:

  data/processed/customers.csv
  data/processed/products.csv
  data/processed/orders.csv

Run from the repo root:
    python data/etl/etl.py
"""

import os
import sys
import pandas as pd

RAW_PATH = os.path.join("data", "raw", "ecommerce_churn_dataset.xls")
OUT_DIR = os.path.join("data", "processed")

REQUIRED_COLUMNS = [
    "order_id", "customer_id", "age", "gender", "product_id", "country",
    "signup_date", "last_purchase_date", "cancellations_count",
    "subscription_status", "unit_price", "quantity", "purchase_frequency",
    "product_name", "category", "Ratings",
]


def load_raw(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        print(f"ERROR: raw file not found at '{path}'.")
        print("Place the dataset there and rename it to 'ecommerce_churn_dataset.xls'.")
        sys.exit(1)

    df = pd.read_excel(path)

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        print(f"ERROR: raw file is missing expected columns: {missing}")
        print(f"Columns found: {df.columns.tolist()}")
        sys.exit(1)

    return df


def parse_dates(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """
    The raw dataset mixes date formats in the same column
    (e.g. '2/21/2023' alongside '2021-08-12 00:00:00').
    format='mixed' lets pandas infer per-value instead of failing on the
    first format mismatch. Unparseable values become NaT rather than
    crashing the whole pipeline — we report how many, don't silently drop.
    """
    for col in columns:
        before_na = df[col].isna().sum()
        df[col] = pd.to_datetime(df[col], format="mixed", errors="coerce")
        after_na = df[col].isna().sum()
        newly_failed = after_na - before_na
        if newly_failed > 0:
            print(f"WARNING: {newly_failed} value(s) in '{col}' could not be parsed as dates.")
    return df


def build_customers(df: pd.DataFrame) -> pd.DataFrame:
    customers = df[[
        "customer_id", "age", "gender", "country", "signup_date",
        "subscription_status", "cancellations_count", "purchase_frequency",
        "Ratings",
    ]].copy()
    customers = customers.rename(columns={"Ratings": "rating"})
    customers = customers.drop_duplicates(subset="customer_id")
    return customers


def build_products(df: pd.DataFrame) -> pd.DataFrame:
    products = df[["product_id", "product_name", "category", "unit_price"]].copy()
    products = products.drop_duplicates(subset="product_id")
    return products


def build_orders(df: pd.DataFrame) -> pd.DataFrame:
    orders = df[[
        "order_id", "customer_id", "product_id", "last_purchase_date",
        "quantity", "unit_price",
    ]].copy()
    orders = orders.rename(columns={"last_purchase_date": "order_date"})
    orders["line_total"] = (orders["quantity"] * orders["unit_price"]).round(2)
    return orders


def main():
    print(f"Reading raw data from {RAW_PATH} ...")
    df = load_raw(RAW_PATH)
    print(f"Loaded {len(df)} rows.")

    df = parse_dates(df, ["signup_date", "last_purchase_date"])

    customers = build_customers(df)
    products = build_products(df)
    orders = build_orders(df)

    os.makedirs(OUT_DIR, exist_ok=True)

    customers.to_csv(os.path.join(OUT_DIR, "customers.csv"), index=False)
    products.to_csv(os.path.join(OUT_DIR, "products.csv"), index=False)
    orders.to_csv(os.path.join(OUT_DIR, "orders.csv"), index=False)

    print()
    print("Done. Written to data/processed/:")
    print(f"  customers.csv : {len(customers)} rows")
    print(f"  products.csv  : {len(products)} rows")
    print(f"  orders.csv    : {len(orders)} rows")


if __name__ == "__main__":
    main()