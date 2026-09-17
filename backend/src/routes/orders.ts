import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

/**
 * GET /api/orders
 * Query params:
 *   page (default 1), limit (default 20, max 100)
 *   customer_id, product_id
 *   date_from, date_to (YYYY-MM-DD, filters on order_date)
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (req.query.customer_id) {
      values.push(req.query.customer_id);
      conditions.push(`o.customer_id = $${values.length}`);
    }
    if (req.query.product_id) {
      values.push(req.query.product_id);
      conditions.push(`o.product_id = $${values.length}`);
    }
    if (req.query.date_from) {
      values.push(req.query.date_from);
      conditions.push(`o.order_date >= $${values.length}`);
    }
    if (req.query.date_to) {
      values.push(req.query.date_to);
      conditions.push(`o.order_date <= $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM orders o ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT o.*, p.product_name, p.category
       FROM orders o
       JOIN products p ON p.product_id = o.product_id
       ${whereClause}
       ORDER BY o.order_date DESC
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

export default router;