import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

/**
 * GET /api/dashboard/summary
 * Single aggregate endpoint for the dashboard landing page: totals,
 * churn snapshot, sales snapshot, and top signals. Each block's source
 * is read from the actual data (not hardcoded), so it correctly
 * reflects mock vs model once real ML output is seeded.
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
        `SELECT customer_id, churn_probability, risk_tier, source
         FROM churn_predictions ORDER BY churn_probability DESC LIMIT 5`
      ),
      pool.query(
        `SELECT product_name, predicted_units, predicted_revenue, source
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
        source: topAtRisk.rows[0]?.source ?? "mock",
      },
      sales: {
        top_products: topProducts.rows,
        top_category_by_volume: categoryDemand.rows[0] ?? null,
        source: topProducts.rows[0]?.source ?? "mock",
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;