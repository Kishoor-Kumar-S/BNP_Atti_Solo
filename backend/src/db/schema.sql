-- Use Case 4: Customer Churn Prediction & Sales Forecasting
-- Schema mirrors the ETL output: customers, products, orders

DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS churn_predictions CASCADE;
DROP TABLE IF EXISTS sales_forecasts CASCADE;

CREATE TABLE customers (
    customer_id           VARCHAR(20) PRIMARY KEY,
    age                    INTEGER NOT NULL,
    gender                 VARCHAR(20) NOT NULL,
    country                VARCHAR(50) NOT NULL,
    signup_date            DATE NOT NULL,
    subscription_status    VARCHAR(20) NOT NULL CHECK (subscription_status IN ('active', 'cancelled', 'paused')),
    cancellations_count    INTEGER NOT NULL DEFAULT 0,
    purchase_frequency     INTEGER NOT NULL DEFAULT 0,
    rating                 NUMERIC(2, 1)
);

CREATE TABLE products (
    product_id      VARCHAR(20) PRIMARY KEY,
    product_name    VARCHAR(200) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    unit_price      NUMERIC(10, 2) NOT NULL
);

CREATE TABLE orders (
    order_id        VARCHAR(20) PRIMARY KEY,
    customer_id     VARCHAR(20) NOT NULL REFERENCES customers(customer_id),
    product_id      VARCHAR(20) NOT NULL REFERENCES products(product_id),
    order_date      DATE NOT NULL,
    quantity        INTEGER NOT NULL,
    unit_price      NUMERIC(10, 2) NOT NULL,
    line_total      NUMERIC(12, 2) NOT NULL
);

-- Populated later by the churn-ml branch's predictions.csv.
-- Backend serves a mock version of this table's shape until that branch merges.
CREATE TABLE churn_predictions (
    customer_id         VARCHAR(20) PRIMARY KEY REFERENCES customers(customer_id),
    churn_probability   NUMERIC(5, 4) NOT NULL,
    risk_tier           VARCHAR(20) NOT NULL CHECK (risk_tier IN ('low', 'medium', 'high', 'critical')),
    top_factor          VARCHAR(200),
    source              VARCHAR(10) NOT NULL DEFAULT 'mock' CHECK (source IN ('mock', 'model'))
);

-- Populated later by the sales-ml branch's forecast.csv.
CREATE TABLE sales_forecasts (
    id                  SERIAL PRIMARY KEY,
    product_name        VARCHAR(200) NOT NULL,
    period              VARCHAR(20) NOT NULL,
    predicted_units     INTEGER NOT NULL,
    predicted_revenue   NUMERIC(12, 2) NOT NULL,
    source              VARCHAR(10) NOT NULL DEFAULT 'mock' CHECK (source IN ('mock', 'model'))
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_customers_subscription_status ON customers(subscription_status);