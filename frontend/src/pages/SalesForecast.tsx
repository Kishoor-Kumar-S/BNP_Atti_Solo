import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { api } from "../lib/api";
import type { SalesForecast as SalesForecastType, DemandByCategory, SalesTrendPoint } from "../lib/api";
import SourceBadge from "../components/SourceBadge";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{value}</div>
    </div>
  );
}

export default function SalesForecast() {
  const [topProducts, setTopProducts] = useState<SalesForecastType[]>([]);
  const [productsSource, setProductsSource] = useState("mock");
  const [demandByCategory, setDemandByCategory] = useState<DemandByCategory[]>([]);
  const [trends, setTrends] = useState<SalesTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.salesTopProducts(), api.salesDemandByCategory(), api.salesTrends()])
      .then(([products, demand, trendData]) => {
        setTopProducts(products.data);
        setProductsSource(products.source);
        setDemandByCategory(demand.data);
        setTrends(trendData.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 dark:text-gray-400">Loading sales forecast...</div>;
  if (error) return <div className="text-red-600 dark:text-red-400">Error: {error}</div>;

  const totalPredictedRevenue = topProducts.reduce((sum, p) => sum + parseFloat(p.predicted_revenue), 0);
  const totalPredictedUnits = topProducts.reduce((sum, p) => sum + p.predicted_units, 0);
  const totalHistoricalRevenue = demandByCategory.reduce((sum, c) => sum + parseFloat(c.total_revenue), 0);

  const trendChartData = trends.map((t) => ({
    month: t.month,
    revenue: parseFloat(t.total_revenue),
  }));

  const categoryChartData = demandByCategory.map((c) => ({
    category: c.category,
    revenue: parseFloat(c.total_revenue),
    units: parseInt(c.total_units),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sales Forecasting</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Predict future sales, identify trends, and optimize inventory planning.
          </p>
        </div>
        <SourceBadge source={productsSource} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Historical Revenue (Total)"
          value={`$${totalHistoricalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        />
        <StatCard
          label="Forecasted Revenue (Next Quarter)"
          value={`$${totalPredictedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        />
        <StatCard label="Forecasted Units (Next Quarter)" value={totalPredictedUnits.toLocaleString()} />
        <StatCard label="Categories Tracked" value={demandByCategory.length} />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Historical Sales by Month</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Real order revenue by month — the forecast (next section) is projected from this trend
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trendChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
              contentStyle={{ borderRadius: 8 }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#00966D" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue & Units by Category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue ($)" fill="#00966D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Top Forecasted Products</h3>
            <SourceBadge source={productsSource} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Units</th>
                  <th className="pb-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 dark:border-gray-850 last:border-0">
                    <td className="py-2 text-gray-700 dark:text-gray-300">{p.product_name}</td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">{p.predicted_units}</td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">
                      ${parseFloat(p.predicted_revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
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