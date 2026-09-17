import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

/**
 * GET /api/sales/forecast
 * Query params: page, limit, period
 */
router.get("/forecast", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (req.query.period) {
      values.push(req.query.period);
      conditions.push(`period = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM sales_forecasts ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT * FROM sales_forecasts ${whereClause}
       ORDER BY predicted_revenue DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      source: dataResult.rows[0]?.source ?? "mock",
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/sales/top-products
 * Top 10 products by predicted sales — direct deliverable from spec.
 */
router.get("/top-products", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sales_forecasts
       ORDER BY predicted_revenue DESC
       LIMIT 10`
    );
    res.json({ data: result.rows, source: result.rows[0]?.source ?? "mock" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/sales/demand-by-category
 * Demand ranking by category, from REAL historical order data (not
 * fabricated) — feeds the inventory/demand-forecasting deliverable.
 */
router.get("/demand-by-category", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.category,
              COUNT(o.order_id) AS order_count,
              SUM(o.quantity) AS total_units,
              ROUND(SUM(o.line_total)::numeric, 2) AS total_revenue,
              ROUND(AVG(o.quantity)::numeric, 2) AS avg_units_per_order
       FROM orders o
       JOIN products p ON p.product_id = o.product_id
       GROUP BY p.category
       ORDER BY total_units DESC`
    );
    res.json({ data: result.rows, source: "real" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/sales/trends
 * Sales trend by month, from real order_date data.
 */
router.get("/trends", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT TO_CHAR(order_date, 'YYYY-MM') AS month,
              COUNT(*) AS order_count,
              ROUND(SUM(line_total)::numeric, 2) AS total_revenue
       FROM orders
       GROUP BY month
       ORDER BY month`
    );
    res.json({ data: result.rows, source: "real" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;