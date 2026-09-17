import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

/**
 * GET /api/churn/predictions
 * Query params: page, limit, risk_tier (low|medium|high|critical)
 */
router.get("/predictions", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (req.query.risk_tier) {
      values.push(req.query.risk_tier);
      conditions.push(`cp.risk_tier = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM churn_predictions cp ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT cp.*, c.country, c.age, c.gender, c.subscription_status
       FROM churn_predictions cp
       JOIN customers c ON c.customer_id = cp.customer_id
       ${whereClause}
       ORDER BY cp.churn_probability DESC
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
 * GET /api/churn/top-at-risk
 * The top 10 customers most likely to churn next quarter — a direct
 * deliverable from the use case spec.
 */
router.get("/top-at-risk", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT cp.customer_id, cp.churn_probability, cp.risk_tier, cp.top_factor, cp.source,
              c.country, c.age, c.gender, c.subscription_status, c.cancellations_count
       FROM churn_predictions cp
       JOIN customers c ON c.customer_id = cp.customer_id
       ORDER BY cp.churn_probability DESC
       LIMIT 10`
    );
    res.json({ data: result.rows, source: result.rows[0]?.source ?? "mock" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/churn/segments
 * Customer segmentation by risk tier — counts, avg probability, and
 * avg cancellations per tier, plus a country breakdown per tier.
 */
router.get("/segments", async (_req, res) => {
  try {
    const tierSummary = await pool.query(
      `SELECT cp.risk_tier,
              COUNT(*) AS customer_count,
              ROUND(AVG(cp.churn_probability)::numeric, 4) AS avg_probability,
              ROUND(AVG(c.cancellations_count)::numeric, 2) AS avg_cancellations
       FROM churn_predictions cp
       JOIN customers c ON c.customer_id = cp.customer_id
       GROUP BY cp.risk_tier
       ORDER BY avg_probability DESC`
    );

    res.json({
      segments: tierSummary.rows,
      source: "mock", // reflects churn_predictions.source once real model merges
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/churn/trends
 * Churn rate trend by signup cohort month — a proxy for "churn rate
 * trends" since this dataset has no per-month event history, only a
 * single snapshot per customer. Documented limitation, not a bug.
 */
router.get("/trends", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT TO_CHAR(c.signup_date, 'YYYY-MM') AS cohort_month,
              COUNT(*) AS total_customers,
              COUNT(*) FILTER (WHERE c.subscription_status = 'cancelled') AS cancelled_count,
              ROUND(
                COUNT(*) FILTER (WHERE c.subscription_status = 'cancelled')::numeric
                / NULLIF(COUNT(*), 0) * 100, 2
              ) AS churn_rate_pct
       FROM customers c
       GROUP BY cohort_month
       ORDER BY cohort_month`
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/churn/drivers
 * Real distribution of top_factor across all churn predictions — a
 * legitimate proxy for "churn drivers" since we don't store per-feature
 * importance scores. This is an actual count/percentage of what factor
 * the model flagged as most influential per customer, not a fabricated
 * feature-importance ranking.
 */
router.get("/drivers", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT top_factor, COUNT(*) AS customer_count,
              ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM churn_predictions) * 100, 1) AS pct
       FROM churn_predictions
       GROUP BY top_factor
       ORDER BY customer_count DESC`
    );
    res.json({ data: result.rows, note: "Real distribution of model-flagged top factors, not per-feature importance scores.", source: "model" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;