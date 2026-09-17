**# Environment \& Port Conventions — BNP\_Atti\_Solo (Use Case 4)**



**This file is the single source of truth for ports, env var names, and folder**

**locations that every branch/role must follow. Any branch that needs a new**

**env var or port must update this file in the same PR.**



**## Ports**



**| Service                | Port  | Notes                                      |**

**|-------------------------|-------|---------------------------------------------|**

**| Backend API (Express)   | 8030  | REST API, JSON responses                    |**

**| Frontend (Vite/React)   | 5200  | Dev server                                  |**

**| PostgreSQL              | 5444  | Local instance, not the OS default 5432     |**



**## Folder layout (all roles must follow this — no exceptions)
BNP\_Atti\_Solo/**

**├── backend/ # Express + TypeScript API, DB schema/migrations**

**├── frontend/ # React/Vite dashboard**

**├── ml/**

**│ ├── churn/ # Churn model + predictions CSV output**

**│ └── sales-demand/ # Sales/demand forecasting model + forecast CSV output**

**├── data/**

**│ ├── raw/ # Original dataset, untouched**

**│ └── processed/ # ETL output — canonical customers/orders/products CSVs**

**└── docs/ # This file and other cross-team docs**



**## Environment variables (canonical names — do not invent new ones)**



**| Variable         | Used by         | Example                                      |**

**|------------------|-----------------|-----------------------------------------------|**

**| `DATABASE\_URL`   | backend         | `postgresql://postgres:postgres@localhost:5444/bnp\_atti\_solo` |**

**| `PORT`           | backend         | `8030`                                        |**

**| `VITE\_API\_URL`   | frontend        | `http://localhost:8030`                       |**

**| `CHURN\_CSV\_PATH` | backend         | `../ml/churn/output/predictions.csv`          |**

**| `SALES\_CSV\_PATH` | backend         | `../ml/sales-demand/output/forecast.csv`      |**



**## CSV output contracts (ML → Backend handoff)**



**Backend will build a mock fallback first (since ETL/ML branches merge later).**

**When merging ETL or ML branches later, the \*\*columns below are the contract\*\***

**— if your branch's real CSV doesn't match, fix your CSV before opening the PR,**

**don't silently let backend guess.**



**### `ml/churn/output/predictions.csv`**

**`customer\_id, churn\_probability, risk\_tier, top\_factor`**



**### `ml/sales-demand/output/forecast.csv`**

**`product\_name, period, predicted\_units, predicted\_revenue`**



**## Git workflow**



**- One branch per role, all forked from `main` at the same point.**

**- No direct commits to `main` — every merge goes through a PR.**

**- Before opening a PR, merge latest `main` into your branch and resolve**

&#x20; **conflicts locally.**


