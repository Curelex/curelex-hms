// hms-react/src/components/common/StatCard.jsx

const StatCard = ({
  title,
  value,
  subtitle,
  valueClass = "",
  icon,
  accent = "#2563eb",
  trend,        // optional: { value: "+12%", up: true }
}) => {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1.5px solid #e2e8f0",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.2s, transform 0.2s",
        cursor: "default",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,0.09)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.04)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: "#94a3b8",
          letterSpacing: 0.6, textTransform: "uppercase",
        }}>
          {title}
        </span>
        {icon && (
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 8,
            background: `${accent}14`, color: accent, fontSize: 16,
          }}>
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div style={{
        fontSize: 26, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1,
        color: valueClass ? undefined : "#0f172a",
      }} className={valueClass}>
        {value ?? "—"}
      </div>

      {/* Subtitle + optional trend */}
      {(subtitle || trend) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {subtitle && (
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{subtitle}</span>
          )}
          {trend && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
              background: trend.up ? "rgba(13,148,136,0.09)" : "rgba(220,38,38,0.09)",
              color: trend.up ? "#0d9488" : "#dc2626",
            }}>
              {trend.up ? "▲" : "▼"} {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;