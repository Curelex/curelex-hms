import { useEffect, useState } from "react";
import MovementChart from "../components/charts/MovementChart";
import StatCard from "../components/common/StatCard";
import LowStockAlert from "../components/common/LowStockAlert";
import { fetchDashboardSummary, fetchMovementReport } from "../services/reportService";
import { fetchLowStock } from "../services/inventoryService";
import { currency } from "../utils/format";

const PERIODS = ["daily", "weekly", "monthly", "yearly"];

const DashboardPage = () => {
  const [period, setPeriod] = useState("daily");
  const [summary, setSummary] = useState(null);
  const [movement, setMovement] = useState({ fastMoving: [], slowMoving: [] });
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [summaryData, movementData, lowStockData] = await Promise.all([
        fetchDashboardSummary(period),
        fetchMovementReport(),
        fetchLowStock()
      ]);
      setSummary(summaryData);
      setMovement(movementData);
      setLowStockItems(lowStockData.data || []);
    };
    load();
  }, [period]);

  return (
    <div className="space-y-4">
      {/* Low stock alert banner */}
      {lowStockItems.length > 0 && <LowStockAlert items={lowStockItems} />}

      {/* Period selector */}
      <div className="flex items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
              period === p
                ? "bg-brand-600 text-white"
                : "border border-brand-100 bg-white text-slate-700 hover:bg-brand-50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Sales" value={currency(summary?.totalSales)} subtitle={`${period} period`} />
        <StatCard title="Total Discounts" value={currency(summary?.totalDiscount)} subtitle="All finalized sales" />
        <StatCard
          title="Profit / Loss"
          value={currency(summary?.profitOrLoss)}
          subtitle="Computed projection"
          valueClass={summary?.profitOrLoss >= 0 ? "text-teal-700" : "text-red-600"}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <MovementChart data={movement.fastMoving || []} title="Fast Moving Products" color="#0d9488" />
        <MovementChart data={movement.slowMoving || []} title="Slow Moving Products" color="#94a3b8" />
      </div>
    </div>
  );
};

export default DashboardPage;