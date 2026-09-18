import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { api } from "../lib/api";
import type { ChurnPrediction, RevenueAtRisk, Pagination } from "../lib/api";

const TIER_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high: "#EA580C",
  medium: "#D97706",
  low: "#16A34A",
};

const PIE_COLORS = ["#00966D", "#0D9488", "#2DD4BF", "#5EEAD4", "#99F6E4", "#CCFBF1"];

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{value}</div>
    </div>
  );
}

export default function HighRiskCustomers() {
  const [customers, setCustomers] = useState<ChurnPrediction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [revenueAtRisk, setRevenueAtRisk] = useState<RevenueAtRisk | null>(null);
  const [tierFilter, setTierFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.churnPredictions({ page, limit: 10, risk_tier: tierFilter || undefined }),
      api.churnRevenueAtRisk(),
    ])
      .then(([predictions, rar]) => {
        setCustomers(predictions.data);
        setPagination(predictions.pagination);
        setRevenueAtRisk(rar);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, tierFilter]);

  // Country breakdown among high/critical customers (client-side aggregation
  // of the current page — good enough for a quick visual, not a full stat)
  const countryBreakdown = customers.reduce<Record<string, number>>((acc, c) => {
    acc[c.country] = (acc[c.country] || 0) + 1;
    return acc;
  }, {});
  const countryPieData = Object.entries(countryBreakdown).map(([name, value]) => ({ name, value }));

  const probabilityBuckets = [
    { range: "0-20%", min: 0, max: 0.2 },
    { range: "20-40%", min: 0.2, max: 0.4 },
    { range: "40-60%", min: 0.4, max: 0.6 },
    { range: "60-80%", min: 0.6, max: 0.8 },
    { range: "80-100%", min: 0.8, max: 1.01 },
  ];
  const histogramData = probabilityBuckets.map((b) => ({
    range: b.range,
    count: customers.filter((c) => {
      const p = parseFloat(c.churn_probability);
      return p >= b.min && p < b.max;
    }).length,
  }));

  if (error) return <div className="text-red-600 dark:text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">High-Risk Customer Intelligence</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Identify customers most likely to churn and take proactive retention actions.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="At-Risk Customers" value={revenueAtRisk?.at_risk_customer_count ?? "—"} />
        <StatCard
          label="Revenue at Risk"
          value={
            revenueAtRisk
              ? `$${parseFloat(revenueAtRisk.at_risk_revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "—"
          }
        />
        <StatCard label="% of Total Revenue" value={revenueAtRisk ? `${revenueAtRisk.pct_of_total_revenue}%` : "—"} />
        <StatCard label="Current Page" value={pagination ? `${pagination.page} / ${pagination.totalPages}` : "—"} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">Filter by tier:</span>
        {["", "critical", "high", "medium", "low"].map((tier) => (
          <button
            key={tier || "all"}
            onClick={() => {
              setTierFilter(tier);
              setPage(1);
            }}
            className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
              tierFilter === tier
                ? "bg-bnp-teal text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {tier || "All"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Customers Most Likely to Churn
            {tierFilter && <span className="text-gray-400 font-normal"> — {tierFilter} tier</span>}
          </h3>
          {loading ? (
            <div className="text-gray-400 text-sm py-8 text-center">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-2 font-medium">Customer</th>
                      <th className="pb-2 font-medium">Probability</th>
                      <th className="pb-2 font-medium">Tier</th>
                      <th className="pb-2 font-medium">Country</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.customer_id} className="border-b border-gray-50 dark:border-gray-850 last:border-0">
                        <td className="py-2 text-gray-700 dark:text-gray-300">{c.customer_id}</td>
                        <td className="py-2 text-gray-500 dark:text-gray-400">
                          {(parseFloat(c.churn_probability) * 100).toFixed(0)}%
                        </td>
                        <td className="py-2">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium capitalize"
                            style={{
                              backgroundColor: `${TIER_COLORS[c.risk_tier]}20`,
                              color: TIER_COLORS[c.risk_tier],
                            }}
                          >
                            {c.risk_tier}
                          </span>
                        </td>
                        <td className="py-2 text-gray-500 dark:text-gray-400">{c.country}</td>
                        <td className="py-2 text-gray-500 dark:text-gray-400 capitalize">
                          {c.subscription_status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-400">
                    {pagination.total.toLocaleString()} total customers
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1 rounded-md text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages}
                      className="px-3 py-1 rounded-md text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Country Breakdown</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Current page only</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={countryPieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                {countryPieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Churn Probability Distribution</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Current page only</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={histogramData}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#00966D" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}