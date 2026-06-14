// hms-react/src/components/common/DataTable.jsx
import { useState } from "react";

const DataTable = ({
  columns,
  rows,
  emptyIcon   = "📋",
  emptyTitle  = "No records found",
  emptyDesc   = "",
  loading     = false,
  onRowClick,
}) => {
  const [hovered, setHovered] = useState(null);

  if (loading) {
    return (
      <div style={{
        background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
        overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {columns.map(col => (
                <th key={col.key} style={{
                  padding: "11px 18px", textAlign: "left",
                  fontSize: 11, fontWeight: 700, color: "#64748b",
                  letterSpacing: 0.5, textTransform: "uppercase",
                  borderBottom: "1px solid #f1f5f9",
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: "12px 18px" }}>
                    <div style={{
                      height: 14, borderRadius: 6,
                      background: "#f1f5f9",
                      width: `${50 + Math.random() * 40}%`,
                      animation: "pulse 1.4s infinite",
                    }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
      overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
    }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {columns.map(col => (
                <th key={col.key} style={{
                  padding: "11px 18px", textAlign: col.align || "left",
                  fontSize: 11, fontWeight: 700, color: "#64748b",
                  letterSpacing: 0.5, textTransform: "uppercase",
                  borderBottom: "1px solid #f1f5f9",
                  whiteSpace: "nowrap",
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 34, marginBottom: 10 }}>{emptyIcon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    {emptyTitle}
                  </div>
                  {emptyDesc && (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{emptyDesc}</div>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={() => setHovered(rowIndex)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    borderBottom: "1px solid #f8fafc",
                    background: hovered === rowIndex ? "#f8fafc" : "transparent",
                    transition: "background 0.12s",
                    cursor: onRowClick ? "pointer" : "default",
                  }}
                >
                  {columns.map(col => (
                    <td
                      key={`${row.id || rowIndex}-${col.key}`}
                      style={{
                        padding: "11px 18px",
                        fontSize: 13, color: "#334155",
                        textAlign: col.align || "left",
                        whiteSpace: col.wrap ? undefined : "nowrap",
                        fontFamily: col.mono ? "monospace" : undefined,
                      }}
                    >
                      {col.render ? col.render(row) : (row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;