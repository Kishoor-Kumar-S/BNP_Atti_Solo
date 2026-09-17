import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

/**
 * IMPORTANT: this dataset has no actual stock-on-hand or inventory
 * data source. Rather than fabricate a stock_level number (which would
 * be actively misleading for an inventory-management deliverable), this
 * endpoint ranks products by REAL historical demand (units sold, order
 * count, revenue) and returns stock_level as null with an explicit
 * "pending" flag. Once a real inventory feed exists, wire it in here
 * instead of removing this honesty check.
 */

/**
 * GET /api/inventory
 * Query params: page, limit, category, sort_by (demand|revenue) default demand
 *
 * demand_tier is computed via NTILE(3) over total_units_sold — an even
 * three-way split (high/medium/low) rather than arbitrary fixed
 * thresholds, so it adapts to whatever the real order data shows.
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const offset = (page - 1) * limit;

    const sortBy = String(req.query.sort_by) === "revenue" ? "total_revenue" : "total_units_sold";

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (req.query.category) {
      values.push(req.query.category);
      conditions.push(`p.category = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT
         p.product_id,
         p.product_name,
         p.category,
         p.unit_price,
         COALESCE(o.total_units_sold, 0) AS total_units_sold,
         COALESCE(o.order_count, 0) AS order_count,
         COALESCE(o.total_revenue, 0) AS total_revenue,
         NTILE(3) OVER (ORDER BY COALESCE(o.total_units_sold, 0) DESC) AS demand_tier_rank,
         NULL AS stock_level,
         'pending' AS stock_data_status
       FROM products p
       LEFT JOIN (
         SELECT product_id,
                SUM(quantity) AS total_units_sold,
                COUNT(*) AS order_count,
                SUM(line_total) AS total_revenue
         FROM orders
         GROUP BY product_id
       ) o ON o.product_id = p.product_id
       ${whereClause}
       ORDER BY ${sortBy === "total_revenue" ? "o.total_revenue" : "o.total_units_sold"} DESC NULLS LAST
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    const withTierLabel = dataResult.rows.map((row) => ({
      ...row,
      demand_tier:
        row.demand_tier_rank === 1 ? "high" : row.demand_tier_rank === 2 ? "medium" : "low",
      recommended_action:
        row.demand_tier_rank === 1
          ? "High demand — prioritize restock"
          : row.demand_tier_rank === 2
          ? "Moderate demand — monitor"
          : "Low demand — deprioritize restock",
    }));

    res.json({
      data: withTierLabel,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      note: "stock_level is not available from any connected data source. Rankings are based on real historical demand (units sold), not fabricated inventory counts.",
      source: "real",
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/inventory/priority
 * Top 10 products by real demand — the restock-priority list for the
 * inventory dashboard widget.
 */
router.get("/priority", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.product_id, p.product_name, p.category, p.unit_price,
              SUM(o.quantity) AS total_units_sold,
              COUNT(o.order_id) AS order_count,
              ROUND(SUM(o.line_total)::numeric, 2) AS total_revenue
       FROM orders o
       JOIN products p ON p.product_id = o.product_id
       GROUP BY p.product_id, p.product_name, p.category, p.unit_price
       ORDER BY total_units_sold DESC
       LIMIT 10`
    );

    res.json({
      data: result.rows,
      note: "Ranked by real units sold. No stock-on-hand data source is connected.",
      source: "real",
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;