import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { DashboardSummary } from "../lib/api";
import SourceBadge from "../components/SourceBadge";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .dashboardSummary()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading dashboard...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Customers" value={data.totals.customers.toLocaleString()} />
          <StatCard label="Total Orders" value={data.totals.orders.toLocaleString()} />
          <StatCard
            label="Total Revenue"
            value={`$${data.totals.total_revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Top At-Risk Customers</h3>
            <SourceBadge source={data.churn.source} />
          </div>
          <div className="space-y-2">
            {data.churn.top_at_risk.map((c) => (
              <div
                key={c.customer_id}
                className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0"
              >
                <span className="text-gray-700">{c.customer_id}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      c.risk_tier === "critical"
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {c.risk_tier}
                  </span>
                  <span className="text-gray-500 w-14 text-right">
                    {(parseFloat(c.churn_probability) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Top Forecasted Products</h3>
            <SourceBadge source={data.sales.source} />
          </div>
          <div className="space-y-2">
            {data.sales.top_products.map((p) => (
              <div
                key={p.product_name}
                className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0"
              >
                <span className="text-gray-700">{p.product_name}</span>
                <span className="text-gray-500">
                  ${parseFloat(p.predicted_revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
          {data.sales.top_category_by_volume && (
            <div className="mt-4 pt-3 border-t border-gray-100 text-sm text-gray-500">
              Top category by volume:{" "}
              <span className="font-medium text-gray-700">
                {data.sales.top_category_by_volume.category}
              </span>{" "}
              ({parseInt(data.sales.top_category_by_volume.total_units).toLocaleString()} units)
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Churn Risk Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.churn.by_tier.map((tier) => (
            <div key={tier.risk_tier} className="text-center p-3 bg-gray-50 rounded-md">
              <div className="text-xl font-semibold text-gray-900">{tier.count}</div>
              <div className="text-xs text-gray-500 capitalize mt-0.5">{tier.risk_tier}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}