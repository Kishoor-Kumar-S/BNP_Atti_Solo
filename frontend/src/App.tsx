import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  TrendingUp,
  Package,
  FileText,
  Search,
  Bell,
  Sun,
  Moon,
  Leaf,
} from "lucide-react";
import { useTheme } from "./lib/useTheme";
import Dashboard from "./pages/Dashboard";
import ChurnAnalysis from "./pages/ChurnAnalysis";
import HighRiskCustomers from "./pages/HighRiskCustomers";
import SalesForecast from "./pages/SalesForecast";
import ProductDemand from "./pages/ProductDemand";
import InsightsReport from "./pages/InsightsReport";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/churn", label: "Customer Analysis", icon: Users },
  { to: "/high-risk", label: "High-Risk Customers", icon: AlertTriangle },
  { to: "/sales", label: "Sales Forecasting", icon: TrendingUp },
  { to: "/demand", label: "Product & Demand", icon: Package },
  { to: "/insights", label: "Insights & Report", icon: FileText },
];

function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-white dark:bg-bnp-dark border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-md bg-bnp-teal flex items-center justify-center text-white font-bold text-sm">
            BP
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
              BNP Paribas
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
              The bank for a changing world
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-base font-semibold text-bnp-teal">Innoversité</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            Ideas today. A smarter tomorrow.
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-bnp-teal/10 text-bnp-teal"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Leaf size={14} className="text-bnp-teal" />
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300">
              People. Data. A More Sustainable Future.
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  const { theme, toggle } = useTheme();

  return (
    <header className="h-16 shrink-0 bg-white dark:bg-bnp-dark border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
      <div className="relative w-96 max-w-full">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search customers, products, or insights..."
          className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-bnp-teal/40"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="p-2 rounded-md text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="relative p-2 rounded-md text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-bnp-teal text-white flex items-center justify-center text-sm font-semibold">
            K
          </div>
          <div className="text-sm">
            <div className="font-medium text-gray-900 dark:text-white leading-tight">
              Kishoor Kumar
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
              Data Analyst
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/churn" element={<Layout><ChurnAnalysis /></Layout>} />
        <Route path="/high-risk" element={<Layout><HighRiskCustomers /></Layout>} />
        <Route path="/sales" element={<Layout><SalesForecast /></Layout>} />
        <Route path="/demand" element={<Layout><ProductDemand /></Layout>} />
        <Route path="/insights" element={<Layout><InsightsReport /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;