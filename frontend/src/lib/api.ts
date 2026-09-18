const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8030";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed: ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardSummary {
  totals: { customers: number; orders: number; total_revenue: number };
  churn: {
    by_tier: { risk_tier: string; count: string }[];
    top_at_risk: { customer_id: string; churn_probability: string; risk_tier: string; source: string }[];
    source: string;
  };
  sales: {
    top_products: { product_name: string; predicted_units: number; predicted_revenue: string; source: string }[];
    top_category_by_volume: { category: string; total_units: string } | null;
    source: string;
  };
}

export interface ChurnPrediction {
  customer_id: string;
  churn_probability: string;
  risk_tier: string;
  top_factor: string;
  source: string;
  country: string;
  age: number;
  gender: string;
  subscription_status: string;
  cancellations_count?: number;
}

export interface ChurnSegment {
  risk_tier: string;
  customer_count: string;
  avg_probability: string;
  avg_cancellations: string;
}

export interface ChurnTrendPoint {
  cohort_month: string;
  total_customers: string;
  cancelled_count: string;
  churn_rate_pct: string;
}

export interface ChurnDriver {
  top_factor: string;
  customer_count: string;
  pct: string;
}

export interface RevenueAtRisk {
  at_risk_customer_count: string;
  at_risk_revenue: string;
  pct_of_total_revenue: string;
  source: string;
}

export interface SalesForecast {
  id: number;
  product_name: string;
  period: string;
  predicted_units: number;
  predicted_revenue: string;
  source: string;
}

export interface DemandByCategory {
  category: string;
  order_count: string;
  total_units: string;
  total_revenue: string;
  avg_units_per_order: string;
}

export interface SalesTrendPoint {
  month: string;
  order_count: string;
  total_revenue: string;
}

export interface InventoryItem {
  product_id: string;
  product_name: string;
  category: string;
  unit_price: string;
  total_units_sold: string;
  order_count: string;
  total_revenue: string;
  demand_tier: string;
  recommended_action: string;
  stock_level: null;
  stock_data_status: string;
}

export const api = {
  dashboardSummary: () => request<DashboardSummary>("/api/dashboard/summary"),

  churnTopAtRisk: () =>
    request<{ data: ChurnPrediction[]; source: string }>("/api/churn/top-at-risk"),

  churnSegments: () =>
    request<{ segments: ChurnSegment[]; source: string }>("/api/churn/segments"),

  churnTrends: () => request<{ data: ChurnTrendPoint[] }>("/api/churn/trends"),

  churnDrivers: () =>
    request<{ data: ChurnDriver[]; note: string; source: string }>("/api/churn/drivers"),

  churnRevenueAtRisk: () => request<RevenueAtRisk>("/api/churn/revenue-at-risk"),

  churnPredictions: (params: { page?: number; limit?: number; risk_tier?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.risk_tier) qs.set("risk_tier", params.risk_tier);
    return request<{ data: ChurnPrediction[]; pagination: Pagination; source: string }>(
      `/api/churn/predictions?${qs.toString()}`
    );
  },

  salesTopProducts: () =>
    request<{ data: SalesForecast[]; source: string }>("/api/sales/top-products"),

  salesDemandByCategory: () =>
    request<{ data: DemandByCategory[]; source: string }>("/api/sales/demand-by-category"),

  salesTrends: () => request<{ data: SalesTrendPoint[]; source: string }>("/api/sales/trends"),

  inventory: (params: { page?: number; limit?: number; category?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.category) qs.set("category", params.category);
    return request<{ data: InventoryItem[]; pagination: Pagination; note: string; source: string }>(
      `/api/inventory?${qs.toString()}`
    );
  },

  inventoryPriority: () =>
    request<{ data: InventoryItem[]; note: string; source: string }>("/api/inventory/priority"),
};

export { ApiError };