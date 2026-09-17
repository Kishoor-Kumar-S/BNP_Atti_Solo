import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

/**
 * GET /api/dashboard/summary
 * Single aggregate endpoint for the dashboard landing page: totals,
 * churn snapshot, sales snapshot, and top signals. Mixes real and mock
 * data — each block is labeled with its own `source`.
 */
router.get("/summary", async (_req, res) => {
  try {
    const [
      customerCount,
      orderStats,
      churnTierCounts,
      topAtRisk,
      topProducts,
      categoryDemand,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM customers"),
      pool.query(
        `SELECT COUNT(*) AS order_count, ROUND(SUM(line_total)::numeric, 2) AS total_revenue
         FROM orders`
      ),
      pool.query(
        `SELECT risk_tier, COUNT(*) AS count
         FROM churn_predictions GROUP BY risk_tier`
      ),
      pool.query(
        `SELECT customer_id, churn_probability, risk_tier
         FROM churn_predictions ORDER BY churn_probability DESC LIMIT 5`
      ),
      pool.query(
        `SELECT product_name, predicted_units, predicted_revenue
         FROM sales_forecasts ORDER BY predicted_revenue DESC LIMIT 5`
      ),
      pool.query(
        `SELECT p.category, SUM(o.quantity) AS total_units
         FROM orders o JOIN products p ON p.product_id = o.product_id
         GROUP BY p.category ORDER BY total_units DESC LIMIT 1`
      ),
    ]);

    res.json({
      totals: {
        customers: parseInt(customerCount.rows[0].count, 10),
        orders: parseInt(orderStats.rows[0].order_count, 10),
        total_revenue: parseFloat(orderStats.rows[0].total_revenue),
      },
      churn: {
        by_tier: churnTierCounts.rows,
        top_at_risk: topAtRisk.rows,
        source: "mock",
      },
      sales: {
        top_products: topProducts.rows,
        top_category_by_volume: categoryDemand.rows[0] ?? null,
        source: "mock",
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;