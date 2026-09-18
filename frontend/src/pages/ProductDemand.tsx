import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";
import type { InventoryItem, Pagination } from "../lib/api";

const TIER_COLORS: Record<string, string> = {
  high: "#16A34A",
  medium: "#D97706",
  low: "#DC2626",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{value}</div>
    </div>
  );
}

export default function ProductDemand() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [priority, setPriority] = useState<InventoryItem[]>([]);
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = ["Electronics", "Clothing", "Beauty", "Sports", "Home"];

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.inventory({ page, limit: 10, category: category || undefined }),
      api.inventoryPriority(),
    ])
      .then(([inv, prio]) => {
        setItems(inv.data);
        setPagination(inv.pagination);
        setNote(inv.note);
        setPriority(prio.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, category]);

  const priorityChartData = priority.slice(0, 8).map((p) => ({
    name: p.product_name,
    units: parseInt(p.total_units_sold),
  }));

  const tierCounts = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.demand_tier] = (acc[i.demand_tier] || 0) + 1;
    return acc;
  }, {});

  if (error) return <div className="text-red-600 dark:text-red-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Product & Demand Forecasting</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Predict product demand, optimize inventory, and align supply with future sales.
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        {note}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={pagination?.total.toLocaleString() ?? "—"} />
        <StatCard label="High Demand (this page)" value={tierCounts.high ?? 0} />
        <StatCard label="Medium Demand (this page)" value={tierCounts.medium ?? 0} />
        <StatCard label="Low Demand (this page)" value={tierCounts.low ?? 0} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500 dark:text-gray-400">Filter by category:</span>
        {["", ...categories].map((c) => (
          <button
            key={c || "all"}
            onClick={() => {
              setCategory(c);
              setPage(1);
            }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              category === c
                ? "bg-bnp-teal text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {c || "All"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Restock Priority (Top 8)</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Ranked by real units sold</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={priorityChartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-gray-200 dark:text-gray-800" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="units" fill="#00966D" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Products {category && <span className="text-gray-400 font-normal">— {category}</span>}
          </h3>
          {loading ? (
            <div className="text-gray-400 text-sm py-8 text-center">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-2 font-medium">Product</th>
                      <th className="pb-2 font-medium">Units Sold</th>
                      <th className="pb-2 font-medium">Demand</th>
                      <th className="pb-2 font-medium">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.product_id} className="border-b border-gray-50 dark:border-gray-850 last:border-0">
                        <td className="py-2 text-gray-700 dark:text-gray-300">{i.product_name}</td>
                        <td className="py-2 text-gray-500 dark:text-gray-400">{i.total_units_sold}</td>
                        <td className="py-2">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium capitalize"
                            style={{
                              backgroundColor: `${TIER_COLORS[i.demand_tier]}20`,
                              color: TIER_COLORS[i.demand_tier],
                            }}
                          >
                            {i.demand_tier}
                          </span>
                        </td>
                        <td className="py-2 text-gray-400 dark:text-gray-500 text-xs italic">Pending</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-400">{pagination.total.toLocaleString()} products</span>
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
      </div>
    </div>
  );
}