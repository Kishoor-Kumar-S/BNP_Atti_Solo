import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

/**
 * GET /api/customers
 * Query params:
 *   page (default 1), limit (default 20, max 100)
 *   subscription_status (active | cancelled | paused)
 *   country
 */
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (req.query.subscription_status) {
      values.push(req.query.subscription_status);
      conditions.push(`subscription_status = $${values.length}`);
    }
    if (req.query.country) {
      values.push(req.query.country);
      conditions.push(`country = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM customers ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT * FROM customers ${whereClause}
       ORDER BY customer_id
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/customers/:id
 * Includes the customer's orders and their churn prediction (if any).
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const customerResult = await pool.query(
      "SELECT * FROM customers WHERE customer_id = $1",
      [id]
    );
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const ordersResult = await pool.query(
      `SELECT o.*, p.product_name, p.category
       FROM orders o
       JOIN products p ON p.product_id = o.product_id
       WHERE o.customer_id = $1
       ORDER BY o.order_date DESC`,
      [id]
    );

    const churnResult = await pool.query(
      "SELECT * FROM churn_predictions WHERE customer_id = $1",
      [id]
    );

    res.json({
      customer: customerResult.rows[0],
      orders: ordersResult.rows,
      churn_prediction: churnResult.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;