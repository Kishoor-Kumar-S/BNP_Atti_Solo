"""
Churn model training script — Use Case 4

Reads data/processed/customers.csv and data/processed/orders.csv
(from data/etl/etl.py), engineers recency/tenure features, trains a
churn classifier, and writes predictions in the contract Backend expects:

    ml/churn/output/predictions.csv
    columns: customer_id, churn_probability, risk_tier, top_factor

Run from the repo root (using the ETL venv for data/etl/etl.py, and
this branch's own ml/churn/venv for this script):
    python ml/churn/train.py
"""

import os
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score

CUSTOMERS_PATH = os.path.join("data", "processed", "customers.csv")
ORDERS_PATH = os.path.join("data", "processed", "orders.csv")
OUTPUT_DIR = os.path.join("ml", "churn", "output")
MODEL_PATH = os.path.join(OUTPUT_DIR, "model.joblib")
PREDICTIONS_PATH = os.path.join(OUTPUT_DIR, "predictions.csv")

NUMERIC_FEATURES = [
    "age", "cancellations_count", "purchase_frequency", "rating",
    "tenure_days", "days_since_last_purchase",
]
CATEGORICAL_FEATURES = ["gender", "country"]

RISK_THRESHOLDS = [
    (0.75, "critical"),
    (0.50, "high"),
    (0.25, "medium"),
]


def load_data() -> pd.DataFrame:
    for path in (CUSTOMERS_PATH, ORDERS_PATH):
        if not os.path.exists(path):
            print(f"ERROR: {path} not found. Run 'python data/etl/etl.py' first (from the ETL venv).")
            sys.exit(1)

    customers = pd.read_csv(CUSTOMERS_PATH, parse_dates=["signup_date"])
    orders = pd.read_csv(ORDERS_PATH, parse_dates=["order_date"])

    # 1:1 customer:order in this dataset, so a plain merge is safe here.
    # A real multi-order dataset would need MAX(order_date) per customer first.
    merged = customers.merge(
        orders[["customer_id", "order_date"]], on="customer_id", how="left"
    )

    reference_date = merged["order_date"].max()
    print(f"Using reference date for recency calc: {reference_date.date()}")

    merged["tenure_days"] = (reference_date - merged["signup_date"]).dt.days
    merged["days_since_last_purchase"] = (reference_date - merged["order_date"]).dt.days

    return merged


def build_label(df: pd.DataFrame) -> pd.Series:
    return (df["subscription_status"] == "cancelled").astype(int)


def top_factor_for_row(row: pd.Series, feature_names: list, coefficients: np.ndarray) -> str:
    contributions = np.abs(row.values * coefficients)
    top_idx = int(np.argmax(contributions))
    raw_name = feature_names[top_idx]

    label_map = {
        "num__age": "customer age",
        "num__cancellations_count": "history of cancellations",
        "num__purchase_frequency": "purchase frequency",
        "num__rating": "satisfaction rating",
        "num__tenure_days": "account tenure",
        "num__days_since_last_purchase": "recency of last purchase",
    }
    if raw_name in label_map:
        return label_map[raw_name]
    if raw_name.startswith("cat__gender_"):
        return "gender segment pattern"
    if raw_name.startswith("cat__country_"):
        return "regional pattern"
    return "mixed factors"


def main():
    print("Loading processed customer + order data...")
    df = load_data()
    print(f"Loaded {len(df)} customers (with recency features).")

    y = build_label(df)
    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]

    print(f"Churn label distribution (cancelled=1): {y.value_counts().to_dict()}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ]
    )

    model = Pipeline(steps=[
        ("preprocess", preprocessor),
        ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced")),
    ])

    print("Training model...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    print("\n--- Evaluation on held-out test set ---")
    print(classification_report(y_test, y_pred, target_names=["not_churned", "churned"]))
    print(f"ROC-AUC: {roc_auc_score(y_test, y_proba):.4f}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"\nModel saved to {MODEL_PATH}")

    print("Scoring all customers for predictions.csv...")
    all_proba = model.predict_proba(X)[:, 1]

    feature_names = model.named_steps["preprocess"].get_feature_names_out()
    coefficients = model.named_steps["classifier"].coef_[0]
    X_transformed = model.named_steps["preprocess"].transform(X)
    if hasattr(X_transformed, "toarray"):
        X_transformed = X_transformed.toarray()

    def risk_tier_for(p: float) -> str:
        for threshold, tier in RISK_THRESHOLDS:
            if p >= threshold:
                return tier
        return "low"

    top_factors = [
        top_factor_for_row(pd.Series(X_transformed[i]), list(feature_names), coefficients)
        for i in range(len(df))
    ]

    predictions = pd.DataFrame({
        "customer_id": df["customer_id"],
        "churn_probability": np.round(all_proba, 4),
        "risk_tier": [risk_tier_for(p) for p in all_proba],
        "top_factor": top_factors,
    })

    predictions.to_csv(PREDICTIONS_PATH, index=False)
    print(f"\nPredictions written to {PREDICTIONS_PATH}")
    print(f"Risk tier distribution: {predictions['risk_tier'].value_counts().to_dict()}")


if __name__ == "__main__":
    main()