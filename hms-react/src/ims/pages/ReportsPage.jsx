// hms-react/src/pages/ReportsPage.jsx
import { useEffect, useState } from "react";
import DataTable from "../components/common/DataTable";
import { fetchStockReport, fetchDashboardSummary } from "../services/reportService";
import { currency } from "../utils/format";

const PERIODS = ["daily", "weekly", "monthly", "yearly"];
const API_BASE = import.meta.env.VITE_IMS_API_URL || "/ims/api/v1";

// ── Mini icons (inline SVG — no extra dep) ───────────────────────────────────
const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
  </svg>
);
const IconTrend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
  </svg>
);
const IconTag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);
const IconProfit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

const STAT_CONFIG = [
  {
    key:     "totalSales",
    label:   "Total Sales",
    icon:    <IconTrend />,
    accent:  "#2563eb",
    bgLight: "rgba(37,99,235,0.07)",
    border:  "rgba(37,99,235,0.18)",
  },
  {
    key:     "totalDiscount",
    label:   "Total Discounts",
    icon:    <IconTag />,
    accent:  "#7c3aed",
    bgLight: "rgba(124,58,237,0.07)",
    border:  "rgba(124,58,237,0.18)",
  },
  {
    key:         "profitOrLoss",
    label:       "Profit / Loss",
    icon:        <IconProfit />,
    accent:      null,   // dynamic — green or red
    bgLight:     null,
    border:      null,
    dynamic:     true,
  },
];

const ReportsPage = () => {
  const [rows,    setRows]    = useState([]);
  const [period,  setPeriod]  = useState("daily");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStockReport(), fetchDashboardSummary(period)])
      .then(([stockData, summaryData]) => {
        setRows(stockData.data || []);
        setSummary(summaryData);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const pdfUrl = () => {
    const token = localStorage.getItem("ims_token");
    return `${API_BASE}/reports/download-pdf?period=${period}&token=${token}`;
  };
  const csvUrl = () => {
    const token = localStorage.getItem("ims_token");
    return `${API_BASE}/reports/sales/export.csv?token=${token}`;
  };

  const profitVal    = summary?.profitOrLoss ?? 0;
  const profitPos    = profitVal >= 0;
  const profitAccent = profitPos ? "#0d9488" : "#dc2626";
  const profitBg     = profitPos ? "rgba(13,148,136,0.07)" : "rgba(220,38,38,0.07)";
  const profitBorder = profitPos ? "rgba(13,148,136,0.2)"  : "rgba(220,38,38,0.2)";

  const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: -0.4 }}>
              Reports & Analytics
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              Inventory, sales, and financial summary
            </p>
          </div>

          {/* Download actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={pdfUrl()}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: "#1e293b", color: "#fff", textDecoration: "none",
                border: "none", cursor: "pointer", transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <IconDownload /> PDF Report
            </a>
            <a
              href={csvUrl()}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: "#fff", color: "#0d9488",
                border: "1.5px solid #0d9488", textDecoration: "none",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#0d9488"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#0d9488"; }}
            >
              <IconDownload /> Export CSV
            </a>
          </div>
        </div>

        {/* Period tabs */}
        <div style={{
          display: "inline-flex", marginTop: 20,
          background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2,
        }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "6px 18px", borderRadius: 8, border: "none",
                fontSize: 13, fontWeight: period === p ? 600 : 400,
                cursor: "pointer", transition: "all 0.15s",
                background: period === p ? "#fff" : "transparent",
                color: period === p ? "#0f172a" : "#64748b",
                boxShadow: period === p ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                textTransform: "capitalize",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        {STAT_CONFIG.map(cfg => {
          const val     = summary?.[cfg.key] ?? 0;
          const accent  = cfg.dynamic ? profitAccent : cfg.accent;
          const bgLight = cfg.dynamic ? profitBg     : cfg.bgLight;
          const border  = cfg.dynamic ? profitBorder : cfg.border;

          return (
            <div
              key={cfg.key}
              style={{
                background: "#fff",
                borderRadius: 14,
                border: `1.5px solid ${border}`,
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                transition: "box-shadow 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.09)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.05)"}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", letterSpacing: 0.5, textTransform: "uppercase" }}>
                  {cfg.label}
                </span>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 34, height: 34, borderRadius: 9,
                  background: bgLight, color: accent,
                }}>
                  {cfg.icon}
                </span>
              </div>

              <div>
                {loading ? (
                  <div style={{ height: 36, width: 120, borderRadius: 6, background: "#f1f5f9", animation: "pulse 1.4s infinite" }} />
                ) : (
                  <div style={{ fontSize: 28, fontWeight: 800, color: accent, letterSpacing: -1, lineHeight: 1 }}>
                    {currency(val)}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>
                  {periodLabel} period
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Stock table ───────────────────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
        overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        {/* Table header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              Current Stock Report
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
              Live inventory status across all products
            </p>
          </div>
          <span style={{
            padding: "3px 10px", borderRadius: 20,
            background: "rgba(37,99,235,0.08)", color: "#2563eb",
            fontSize: 11, fontWeight: 600,
          }}>
            {rows.length} products
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            Loading stock data…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>No stock records found</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Add products to inventory to see them here</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Product", "SKU", "Quantity", "Stock Status"].map(h => (
                    <th key={h} style={{
                      padding: "10px 20px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, color: "#64748b",
                      letterSpacing: 0.5, textTransform: "uppercase",
                      borderBottom: "1px solid #f1f5f9",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const statusMap = {
                    out_of_stock: { label: "Out of Stock", color: "#dc2626", bg: "rgba(220,38,38,0.09)" },
                    low_stock:    { label: "Low Stock",    color: "#d97706", bg: "rgba(217,119,6,0.09)" },
                    available:    { label: "Available",    color: "#0d9488", bg: "rgba(13,148,136,0.09)" },
                  };
                  const s = statusMap[row.status] || { label: row.status || "Unknown", color: "#64748b", bg: "#f1f5f9" };

                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid #f8fafc", transition: "background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                        {row.productName}
                      </td>
                      <td style={{ padding: "12px 20px", fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>
                        {row.sku || "—"}
                      </td>
                      <td style={{ padding: "12px 20px", fontSize: 13, color: "#334155", fontWeight: 500 }}>
                        {row.quantity ?? "—"}
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <span style={{
                          display: "inline-block", padding: "3px 10px",
                          borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: s.bg, color: s.color,
                        }}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default ReportsPage;