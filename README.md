**# BNP\_Atti\_Solo — Use Case 4: Customer Churn Prediction \& Sales Forecasting**



**Solo practice repo simulating a 6-person hackathon team via feature branches.**

**Each branch plays one team role; branches merge into `main` via PR.**



**Conventions (ports, env vars, folder layout, CSV contracts) live in**

**\[`docs/ENV\_CONVENTIONS.md`](./docs/ENV\_CONVENTIONS.md) — read that first.**



**## Roles / branches**



**| Branch                        | Role                          | Deliverable                                  |**

**|--------------------------------|--------------------------------|-----------------------------------------------|**

**| `feature/integration-devops`  | Integration / DevOps          | Conventions, CI, env templates (this branch)  |**

**| `feature/data-etl`            | Data Preprocessing / ETL      | Cleaned `customers` / `orders` / `products` CSVs |**

**| `feature/backend`             | Backend + DB                  | Express + TS API, Postgres schema             |**

**| `feature/churn-ml`            | Churn ML                      | Churn model + `predictions.csv`               |**

**| `feature/sales-ml`            | Sales/Demand Forecasting ML   | Forecast model + `forecast.csv`               |**

**| `feature/frontend`            | Frontend UI                   | React/Vite dashboard, 5 pages                 |**



**## Running locally**



**### Backend**

**```powershell**

**cd backend**

**npm install**

**copy .env.example .env**

**npm run dev**

**# → http://localhost:8030**

**```**



**### Frontend**

**```powershell**

**cd frontend**

**npm install**

**copy .env.example .env**

**npm run dev**

**# → http://localhost:5200**

**```**



**### PostgreSQL**

**Local instance on port `5444`. Create the database once:**

**```powershell**

**psql -U postgres -p 5444 -c "CREATE DATABASE bnp\_atti\_solo;"**

**```**



**### ML (churn / sales-demand)**

**```powershell**

**cd ml\\churn**

**python -m venv venv**

**venv\\Scripts\\Activate.ps1**

**pip install -r requirements.txt**

**python train.py**

**# writes ml/churn/output/predictions.csv**

**```**



**## Git workflow**



**- One branch per role, all forked from `main` at the same starting point.**

**- No direct commits to `main`.**

**- Every branch opens a PR into `main`; merge conflicts are resolved on the**

&#x20; **feature branch before merging, not after.**

**- Before starting integration work, pull latest `main` into your branch:**

**```powershell**

&#x20; **git checkout feature/backend**

&#x20; **git merge main**

**```**



**## Dataset**



**Source: `data/raw/E-Commerce\_Customer\_Insights\_and\_Churn\_Dataset.xls`**

**(order-level e-commerce data — customer demographics, subscription status,**

**cancellations, purchase history). ETL branch produces the canonical cleaned**

**CSVs in `data/processed/`.**

