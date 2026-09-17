import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db/pool";

import customersRouter from "./routes/customers";
import productsRouter from "./routes/products";
import ordersRouter from "./routes/orders";
import churnRouter from "./routes/churn";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8030;

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "disconnected", error: (err as Error).message });
  }
});

app.use("/api/customers", customersRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/churn", churnRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});