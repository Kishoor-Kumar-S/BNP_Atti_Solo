import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { api } from "../lib/api";
import type { ChurnPrediction, ChurnSegment, ChurnTrendPoint, ChurnDriver } from "../lib/api";

const TIER_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high: "#EA580C",
  medium: "#D97706",
  low: "#16A34A",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{value}</div>
    </div>
  );
}

export default function ChurnAnalysis() {
  const [topAtRisk, setTopAtRisk] = useState<ChurnPrediction[]>([]);
  const [segments, setSegments] = useState<ChurnSegment[]>([]);
  const [trends, setTrends] = useState<ChurnTrendPoint[]>([]);
  const [drivers, setDrivers] = useState<ChurnDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.churnTopAtRisk(),
      api.churnSegments(),
      api.churnTrends(),
      api.churnDrivers(),
    ])
      .then(([atRisk, segs, trendData, driverData]) => {
        setTopAtRisk(atRisk.data);
        setSegments(segs.segments);
        setTrends(trendData.data);
        setDrivers(driverData.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 dark:text-gray-400">Loading churn analysis...</div>;
  if (error) return <div className="text-red-600 dark:text-red-400">Error: {error}</div>;

  const totalCustomers = segments.reduce((sum, s) => sum + parseInt(s.customer_count), 0);
  const totalAtRisk = segments
    .filter((s) => s.risk_tier === "high" || s.risk_tier === "critical")
    .reduce((sum, s) => sum + parseInt(s.customer_count), 0);

  const pieData = segments.map((s) => ({
    name: s.risk_tier,
    value: parseInt(s.customer_count),
  }));

  const trendChartData = trends.map((t) => ({
    month: t.cohort_month,
    churnRate: parseFloat(t.churn_rate_pct),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Churn Analysis</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Understand customer behavior, identify churn risks, and discover opportunities for retention.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Customers" value={totalCustomers.toLocaleString()} />
        <StatCard label="At-Risk (High + Critical)" value={totalAtRisk.toLocaleString()} />
        <StatCard
          label="At-Risk Share"
          value={`${totalCustomers ? ((totalAtRisk / totalCustomers) * 100).toFixed(1) : 0}%`}
        />
        <StatCard label="Segments Tracked" value={segments.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">Churn Rate by Signup Cohort</h3>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Proxy trend by signup month (dataset has no repeat-event history for a true time series)
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-500" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-500" unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--tooltip-bg, white)", borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Line type="monotone" dataKey="churnRate" stroke="#00966D" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Segmentation by Risk</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={TIER_COLORS[entry.name] || "#9CA3AF"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {segments.map((s) => (
              <div key={s.risk_tier} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TIER_COLORS[s.risk_tier] }} />
                  <span className="capitalize text-gray-600 dark:text-gray-300">{s.risk_tier}</span>
                </div>
                <span className="text-gray-500 dark:text-gray-400">{s.customer_count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Top Model-Flagged Factors</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Real distribution of the factor the model weighted most per customer — not a feature-importance score
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={drivers} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
              <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
              <YAxis type="category" dataKey="top_factor" tick={{ fontSize: 11 }} width={130} />
              <Tooltip />
              <Bar dataKey="pct" fill="#00966D" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top 10 Customers Most Likely to Churn</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Probability</th>
                  <th className="pb-2 font-medium">Tier</th>
                  <th className="pb-2 font-medium">Country</th>
                </tr>
              </thead>
              <tbody>
                {topAtRisk.map((c) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}