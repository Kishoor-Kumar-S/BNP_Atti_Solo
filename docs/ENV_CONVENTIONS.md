# Environment & Port Conventions — BNP_Atti_Solo (Use Case 4)

This file is the single source of truth for ports, env var names, and folder
locations that every branch/role must follow. Any branch that needs a new
env var or port must update this file in the same PR.

## Ports

| Service                | Port  | Notes                                      |
|-------------------------|-------|---------------------------------------------|
| Backend API (Express)   | 8030  | REST API, JSON responses                    |
| Frontend (Vite/React)   | 5200  | Dev server                                  |
| PostgreSQL              | 5432  | Shared local instance (default); isolated via a dedicated `bnp_atti_solo` database, not a separate server |

## Folder layout (all roles must follow this — no exceptions)

BNP_Atti_Solo/
├── backend/ # Express + TypeScript API, DB schema/migrations
├── frontend/ # React/Vite dashboard
├── ml/
│ ├── churn/ # Churn model + predictions CSV output
│ └── sales-demand/ # Sales/demand forecasting model + forecast CSV output
├── data/
│ ├── raw/ # Original dataset, untouched
│ └── processed/ # ETL output — canonical customers/orders/products CSVs
└── docs/ # This file and other cross-team docs


## Environment variables (canonical names — do not invent new ones)

| Variable         | Used by         | Example                                      |
|------------------|-----------------|-----------------------------------------------|
| `DATABASE_URL`   | backend         | `postgresql://postgres:<password>@localhost:5432/bnp_atti_solo` |
| `PORT`           | backend         | `8030`                                        |
| `VITE_API_URL`   | frontend        | `http://localhost:8030`                       |
| `CHURN_CSV_PATH` | backend         | `../ml/churn/output/predictions.csv`          |
| `SALES_CSV_PATH` | backend         | `../ml/sales-demand/output/forecast.csv`      |

## CSV output contracts (ML → Backend handoff)

Backend will build a mock fallback first (since ETL/ML branches merge later).
When merging ETL or ML branches later, the **columns below are the contract**
— if your branch's real CSV doesn't match, fix your CSV before opening the PR,
don't silently let backend guess.

### `ml/churn/output/predictions.csv`
`customer_id, churn_probability, risk_tier, top_factor`

### `ml/sales-demand/output/forecast.csv`
`product_name, period, predicted_units, predicted_revenue`

## Git workflow

- One branch per role, all forked from `main` at the same point.
- No direct commits to `main` — every merge goes through a PR.
- Before opening a PR, merge latest `main` into your branch and resolve
  conflicts locally.