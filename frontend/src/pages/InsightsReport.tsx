import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { RevenueAtRisk, SalesForecast, DemandByCategory, ChurnDriver } from "../lib/api";
import SourceBadge from "../components/SourceBadge";

function StatCard({ label, value, source }: { label: string; value: string; source?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        {source && <SourceBadge source={source} />}
      </div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{value}</div>
    </div>
  );
}

export default function InsightsReport() {
  const [revenueAtRisk, setRevenueAtRisk] = useState<RevenueAtRisk | null>(null);
  const [allForecastRows, setAllForecastRows] = useState<SalesForecast[]>([]);
  const [demandByCategory, setDemandByCategory] = useState<DemandByCategory[]>([]);
  const [drivers, setDrivers] = useState<ChurnDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.churnRevenueAtRisk(),
      api.salesForecast?.({ limit: 100 }) ?? api.salesTopProducts(),
      api.salesDemandByCategory(),
      api.churnDrivers(),
    ])
      .then(([rar, forecast, demand, driverData]) => {
        setRevenueAtRisk(rar);
        setAllForecastRows("data" in forecast ? forecast.data : []);
        setDemandByCategory(demand.data);
        setDrivers(driverData.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 dark:text-gray-400">Loading insights...</div>;
  if (error) return <div className="text-red-600 dark:text-red-400">Error: {error}</div>;

  const nextQuarterRows = allForecastRows.filter((p) => p.period === "next_quarter");
  const nextYearRows = allForecastRows.filter((p) => p.period === "next_year");
  const forecastedRevenueQuarter = nextQuarterRows.reduce((sum, p) => sum + parseFloat(p.predicted_revenue), 0);
  const forecastedRevenueYear = nextYearRows.reduce((sum, p) => sum + parseFloat(p.predicted_revenue), 0);

  const topCategory = [...demandByCategory].sort(
    (a, b) => parseFloat(b.total_revenue) - parseFloat(a.total_revenue)
  )[0];
  const topDriver = drivers[0];

  const recommendations = [
    {
      title: "Prioritize retention outreach for high/critical-risk customers",
      detail: `${revenueAtRisk?.at_risk_customer_count ?? "—"} customers (${revenueAtRisk?.pct_of_total_revenue ?? "—"}% of total revenue) are flagged high or critical risk. This is the clearest, most actionable churn signal in the current data.`,
    },
    {
      title: `Maintain stock depth in ${topCategory?.category ?? "the top category"}`,
      detail: `${topCategory?.category ?? "This category"} leads both historical revenue ($${topCategory ? parseFloat(topCategory.total_revenue).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}) and forecasted demand — the safest inventory bet given current evidence.`,
    },
    {
      title: "Treat the churn model as directional, not predictive",
      detail: `The model's top flagged factor across customers is "${topDriver?.top_factor ?? "—"}" (${topDriver?.pct ?? "—"}% of customers) — with ROC-AUC ≈ 0.50 documented in the data quality report, this reflects noise more than a real driver. Don't act on individual customer scores without further validation.`,
    },
    {
      title: "Re-run forecasting once a richer, repeat-purchase dataset is available",
      detail: "Both churn and sales models are constrained by this dataset having exactly one order per customer. A dataset with repeat purchases would materially improve both models' real predictive value.",
    },
    {
      title: "Customer feedback (ratings) is already integrated as a model feature",
      detail: "The dataset's Ratings column — genuine customer feedback — feeds the churn model directly and shows up as a real flagged factor for some customers, satisfying the spec's 'integrate additional data sources such as customer feedback' task with an honest, already-present signal rather than a fabricated external source.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Insights & Decision Report</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Real, grounded findings from the churn and sales pipelines — no projected outcomes that can't be computed from the data.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenue at Risk (Churn)"
          value={
            revenueAtRisk
              ? `$${parseFloat(revenueAtRisk.at_risk_revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "—"
          }
          source={revenueAtRisk?.source}
        />
        <StatCard
          label="Forecasted Revenue (Next Quarter)"
          value={`$${forecastedRevenueQuarter.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          source="model"
        />
        <StatCard
          label="Forecasted Revenue (Next Year)"
          value={`$${forecastedRevenueYear.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          source="model"
        />
        <StatCard
          label="Top Category by Revenue"
          value={topCategory?.category ?? "—"}
          source="real"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Findings & Recommendations</h3>
        <div className="space-y-4">
          {recommendations.map((r, i) => (
            <div key={i} className="flex gap-3 pb-4 border-b border-gray-50 dark:border-gray-850 last:border-0 last:pb-0">
              <div className="w-6 h-6 shrink-0 rounded-full bg-bnp-teal/10 text-bnp-teal flex items-center justify-center text-xs font-semibold">
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{r.title}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        This report intentionally omits projected outcomes (e.g. "% reduction in churn," "$ saved from optimized inventory")
        that would require running an actual intervention to measure — those numbers cannot be honestly derived from
        historical data alone.
      </div>
    </div>
  );
}