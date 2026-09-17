import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

/**
 * GET /api/products
 * Query params:
 *   page (default 1), limit (default 20, max 100)
 *   category
 *   sort_by (unit_price | product_name) — default product_name
 *   order (asc | desc) — default asc
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const offset = (page - 1) * limit;

    const allowedSort = ["unit_price", "product_name"];
    const sortBy = allowedSort.includes(String(req.query.sort_by)) ? String(req.query.sort_by) : "product_name";
    const order = String(req.query.order).toLowerCase() === "desc" ? "DESC" : "ASC";

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (req.query.category) {
      values.push(req.query.category);
      conditions.push(`category = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT * FROM products ${whereClause}
       ORDER BY ${sortBy} ${order}
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/products/:id
 * Includes recent orders for this product (useful for demand-side views).
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const productResult = await pool.query(
      "SELECT * FROM products WHERE product_id = $1",
      [id]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const orderStatsResult = await pool.query(
      `SELECT COUNT(*) AS order_count, COALESCE(SUM(quantity), 0) AS total_units_sold,
              COALESCE(SUM(line_total), 0) AS total_revenue
       FROM orders WHERE product_id = $1`,
      [id]
    );

    res.json({
      product: productResult.rows[0],
      stats: orderStatsResult.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;