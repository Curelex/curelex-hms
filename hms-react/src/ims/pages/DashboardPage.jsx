// hms-react/src/pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import MovementChart from "../components/charts/MovementChart";
import { fetchDashboardSummary, fetchMovementReport } from "../services/reportService";
import { fetchLowStock } from "../services/inventoryService";
import { currency } from "../utils/format";

const PERIODS = ["daily", "weekly", "monthly", "yearly"];

const DashboardPage = () => {
  const [period,        setPeriod]        = useState("daily");
  const [summary,       setSummary]       = useState(null);
  const [movement,      setMovement]      = useState({ fastMoving: [], slowMoving: [] });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchDashboardSummary(period),
      fetchMovementReport(),
      fetchLowStock(),
    ]).then(([summaryData, movementData, lowStockData]) => {
      setSummary(summaryData);
      setMovement(movementData);
      setLowStockItems(lowStockData.data || []);
    }).finally(() => setLoading(false));
  }, [period]);

  const profitPos   = (summary?.profitOrLoss ?? 0) >= 0;
  const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1150, margin: "0 auto" }}>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: -0.4 }}>
          Dashboard
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
          Pharmacy performance overview
        </p>
      </div>

      {/* ── Low stock alert banner ────────────────────────────────── */}
      {lowStockItems.length > 0 && (
        <div style={{
          marginBottom: 20, padding: "12px 18px", borderRadius: 12,
          background: "rgba(217,119,6,0.07)", border: "1.5px solid rgba(217,119,6,0.25)",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#92400e" }}>
              {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} running low on stock
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {lowStockItems.slice(0, 8).map((item, i) => (
                <span key={i} style={{
                  padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: "rgba(217,119,6,0.12)", color: "#b45309",
                }}>
                  {item.product?.name || item.name} ({item.quantity ?? 0} left)
                </span>
              ))}
              {lowStockItems.length > 8 && (
                <span style={{ fontSize: 11, color: "#b45309", fontWeight: 600, alignSelf: "center" }}>
                  +{lowStockItems.length - 8} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Period selector ───────────────────────────────────────── */}
      <div style={{
        display: "inline-flex", marginBottom: 22,
        background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2,
      }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: "6px 20px", borderRadius: 8, border: "none",
            fontSize: 13, fontWeight: period === p ? 600 : 400,
            cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize",
            background: period === p ? "#fff" : "transparent",
            color: period === p ? "#0f172a" : "#64748b",
            boxShadow: period === p ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
          }}>
            {p}
          </button>
        ))}
      </div>

      {/* ── Stat cards ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginBottom: 28 }}>

        {/* Total Sales */}
        <StatCard
          title="Total Sales"
          subtitle={`${periodLabel} period`}
          accent="#2563eb"
          icon="💰"
          loading={loading}
          value={currency(summary?.totalSales)}
        />

        {/* Total Discounts */}
        <StatCard
          title="Total Discounts"
          subtitle="All finalized sales"
          accent="#7c3aed"
          icon="🏷️"
          loading={loading}
          value={currency(summary?.totalDiscount)}
        />

        {/* Profit / Loss */}
        <StatCard
          title="Profit / Loss"
          subtitle="Computed projection"
          accent={profitPos ? "#0d9488" : "#dc2626"}
          icon={profitPos ? "📈" : "📉"}
          loading={loading}
          value={currency(summary?.profitOrLoss)}
          valuePrefix={profitPos ? "+" : ""}
        />
      </div>

      {/* ── Movement charts ───────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(400px,1fr))", gap: 18, marginBottom: 28 }}>
        <ChartCard title="Fast Moving Products" subtitle="Top sellers by quantity" color="#0d9488" data={movement.fastMoving || []} />
        <ChartCard title="Slow Moving Products" subtitle="Low turnover products"   color="#94a3b8" data={movement.slowMoving || []} />
      </div>

      {/* ── Quick stats row ───────────────────────────────────────── */}
      {lowStockItems.length > 0 && (
        <div style={{
          background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
          padding: "18px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
            Low Stock Items
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {lowStockItems.map((item, i) => {
              const qty  = item.quantity ?? 0;
              const isOut = qty === 0;
              return (
                <div key={i} style={{
                  padding: "10px 14px", borderRadius: 10,
                  border: `1.5px solid ${isOut ? "rgba(220,38,38,0.2)" : "rgba(217,119,6,0.2)"}`,
                  background: isOut ? "rgba(220,38,38,0.04)" : "rgba(217,119,6,0.04)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                      {item.product?.name || item.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      {item.product?.sku || "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: isOut ? "#dc2626" : "#d97706" }}>
                      {qty}
                    </div>
                    <div style={{ fontSize: 10, color: isOut ? "#dc2626" : "#d97706", fontWeight: 600 }}>
                      {isOut ? "OUT" : "LOW"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Inline StatCard (no dep on external component) ────────────────────────────
function StatCard({ title, subtitle, value, accent, icon, loading, valuePrefix = "" }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        background: "#fff", borderRadius: 14,
        border: `1.5px solid ${accent}22`,
        padding: "20px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.2s, transform 0.2s",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.09)" : "0 1px 6px rgba(0,0,0,0.05)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
          {title}
        </span>
        <span style={{
          width: 34, height: 34, borderRadius: 9, fontSize: 16,
          background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </span>
      </div>
      {loading ? (
        <div style={{ height: 36, width: 130, borderRadius: 6, background: "#f1f5f9", animation: "pulse 1.4s infinite" }} />
      ) : (
        <div style={{ fontSize: 28, fontWeight: 800, color: accent, letterSpacing: -1, lineHeight: 1 }}>
          {valuePrefix}{value}
        </div>
      )}
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{subtitle}</div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

// ── Chart wrapper card ────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, color, data }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
      padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
    }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{subtitle}</div>
      </div>
      {data.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          No data for this period
        </div>
      ) : (
        <MovementChart data={data} title={title} color={color} />
      )}
    </div>
  );
}

export default DashboardPage;