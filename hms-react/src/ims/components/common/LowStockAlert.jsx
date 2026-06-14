// hms-react/src/components/common/LowStockAlert.jsx
// Kept for backward compatibility but DashboardPage now renders its own inline alert.
// This component is still usable on other pages if needed.

const LowStockAlert = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <div style={{
      padding: "12px 18px", borderRadius: 12,
      background: "rgba(217,119,6,0.07)", border: "1.5px solid rgba(217,119,6,0.25)",
      display: "flex", alignItems: "flex-start", gap: 12,
      fontFamily: "'Inter','Segoe UI',sans-serif",
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#92400e" }}>
          {items.length} product{items.length !== 1 ? "s" : ""} need attention
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {items.map((entry, i) => {
            const name  = entry.product?.name || entry.name || "Unknown";
            const qty   = entry.quantity ?? 0;
            const isOut = qty === 0;
            return (
              <span key={i} style={{
                padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: isOut ? "rgba(220,38,38,0.1)" : "rgba(217,119,6,0.12)",
                color: isOut ? "#dc2626" : "#b45309",
              }}>
                {name} — {qty} left{isOut ? " (OUT)" : ""}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LowStockAlert;