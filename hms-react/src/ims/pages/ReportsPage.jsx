

import { useEffect, useState } from "react";
import DataTable from "../components/common/DataTable";
import StatCard from "../components/common/StatCard";
import { fetchStockReport, fetchDashboardSummary } from "../services/reportService";
import { currency } from "../utils/format";

const PERIODS = ["daily", "weekly", "monthly", "yearly"];
const API_BASE = import.meta.env.VITE_IMS_API_URL || "/ims/api/v1";

const ReportsPage = () => {
  const [rows, setRows]       = useState([]);
  const [period, setPeriod]   = useState("daily");
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [stockData, summaryData] = await Promise.all([
        fetchStockReport(),
        fetchDashboardSummary(period)
      ]);
      setRows(stockData.data || []);
      setSummary(summaryData);
    };
    load();
  }, [period]);

  // Build PDF download URL with token for auth
  const pdfDownloadUrl = () => {
    const token = localStorage.getItem("ims_token");
    return `${API_BASE}/reports/download-pdf?period=${period}&token=${token}`;
  };

  const csvDownloadUrl = () => {
    const token = localStorage.getItem("ims_token");
    return `${API_BASE}/reports/sales/export.csv?token=${token}`;
  };

  return (
    <div className="space-y-4">
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

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Sales"
          value={currency(summary?.totalSales)}
          subtitle={`${period} period`}
        />
        <StatCard
          title="Total Discounts"
          value={currency(summary?.totalDiscount)}
          subtitle={`${period} period`}
        />
        <StatCard
          title="Profit / Loss"
          value={currency(summary?.profitOrLoss)}
          subtitle={`${period} period`}
          valueClass={summary?.profitOrLoss >= 0 ? "text-teal-700" : "text-red-600"}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Current stock report</h3>
        <div className="flex gap-2">
          {/* Download PDF button — downloads the full report for selected period */}
          <a
            href={pdfDownloadUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            {/* simple download icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download {period} report PDF
          </a>

          {/* Export CSV */}
          <a
            href={csvDownloadUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Export sales CSV
          </a>
        </div>
      </div>

      {/* Stock table */}
      <DataTable
        columns={[
          { key: "productName", label: "Product" },
          { key: "sku",         label: "SKU" },
          { key: "quantity",    label: "Quantity" },
          {
            key: "status",
            label: "Stock status",
            render: (row) => {
              const map = {
                out_of_stock: "bg-red-100 text-red-700",
                low_stock:    "bg-amber-100 text-amber-700",
                available:    "bg-teal-100 text-teal-700"
              };
              return (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[row.status] || ""}`}>
                  {row.status?.replace(/_/g, " ")}
                </span>
              );
            }
          }
        ]}
        rows={rows}
      />
    </div>
  );
};

export default ReportsPage;