// hms-react/src/pages/InventoryPage.jsx
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import usePermissions from "../hooks/usePermissions";
import { adjustInventory, fetchInventory } from "../services/inventoryService";
import { fetchProducts } from "../services/productService";

const selectStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 9, fontSize: 13,
  border: "1.5px solid #e2e8f0", background: "#fff", outline: "none",
  color: "#0f172a", boxSizing: "border-box", appearance: "none",
  cursor: "pointer", transition: "border-color 0.15s",
};
const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 9, fontSize: 13,
  border: "1.5px solid #e2e8f0", background: "#fff", outline: "none",
  color: "#0f172a", boxSizing: "border-box", transition: "border-color 0.15s",
};
const labelStyle = {
  fontSize: 11, fontWeight: 600, color: "#64748b",
  textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5,
};

const InventoryPage = () => {
  const { can } = usePermissions();
  const canAdjust = can("inventory.adjust");

  const [rows,     setRows]     = useState([]);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all"); // all | expired | expiring | low | out
  const [adjustForm, setAdjustForm] = useState({
    productId: "", adjustment: "", reason: "", expiryDate: "",
  });

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await fetchInventory();
      setRows(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
    fetchProducts().then(d => setProducts(d.data || []));
  }, []);

  const onAdjust = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await adjustInventory({
        productId:  adjustForm.productId,
        adjustment: Number(adjustForm.adjustment),
        reason:     adjustForm.reason,
        expiryDate: adjustForm.expiryDate || null,
      });
      toast.success("Stock adjusted");
      setAdjustForm({ productId: "", adjustment: "", reason: "", expiryDate: "" });
      await loadInventory();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Adjustment failed");
    } finally {
      setSaving(false);
    }
  };

  // Sort: earliest expiry first, no expiry to bottom
  const sortedRows = [...rows].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate) - new Date(b.expiryDate);
  });

  // Filter + search
  const filtered = sortedRows.filter(row => {
    const name = row.product?.name?.toLowerCase() || "";
    const sku  = row.product?.sku?.toLowerCase()  || "";
    const q    = search.toLowerCase();
    const matchesSearch = !search || name.includes(q) || sku.includes(q);
    const matchesFilter =
      filter === "all"      ? true :
      filter === "expired"  ? row.isExpired :
      filter === "expiring" ? row.isExpiringSoon :
      filter === "low"      ? row.lowStock :
      filter === "out"      ? row.outOfStock : true;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const expiredCount  = rows.filter(r => r.isExpired).length;
  const expiringCount = rows.filter(r => r.isExpiringSoon && !r.isExpired).length;
  const lowCount      = rows.filter(r => r.lowStock && !r.outOfStock).length;
  const outCount      = rows.filter(r => r.outOfStock).length;
  const totalQty      = rows.reduce((s, r) => s + (r.quantity || 0), 0);

  const adjustment = Number(adjustForm.adjustment) || 0;
  const isPositive = adjustment > 0;

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: -0.4 }}>
          Inventory
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
          Track stock levels, expiry dates and adjustments
        </p>
      </div>

      {/* ── Summary stat cards ────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Products", value: rows.length,    accent: "#2563eb", onClick: () => setFilter("all") },
          { label: "Total Units",    value: totalQty,       accent: "#7c3aed", onClick: () => setFilter("all") },
          { label: "Expired",        value: expiredCount,   accent: expiredCount  > 0 ? "#dc2626" : "#94a3b8", onClick: () => setFilter("expired")  },
          { label: "Expiring Soon",  value: expiringCount,  accent: expiringCount > 0 ? "#d97706" : "#94a3b8", onClick: () => setFilter("expiring") },
          { label: "Low Stock",      value: lowCount,       accent: lowCount      > 0 ? "#d97706" : "#94a3b8", onClick: () => setFilter("low")      },
          { label: "Out of Stock",   value: outCount,       accent: outCount      > 0 ? "#dc2626" : "#94a3b8", onClick: () => setFilter("out")      },
        ].map(s => (
          <div key={s.label}
            onClick={s.onClick}
            style={{
              background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0",
              padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.09)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.accent, marginTop: 6, letterSpacing: -0.5 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Adjust stock form ─────────────────────────────────────── */}
      {canAdjust && (
        <div style={{
          background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
          padding: "20px 22px", marginBottom: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        }}>
          <h2 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
            Adjust Stock
          </h2>

          <form onSubmit={onAdjust}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 14 }}>

              {/* Product */}
              <div>
                <label style={labelStyle}>Product *</label>
                <div style={{ position: "relative" }}>
                  <select value={adjustForm.productId}
                    onChange={e => setAdjustForm(p => ({ ...p, productId: e.target.value }))}
                    style={selectStyle} required
                    onFocus={e => e.target.style.borderColor = "#2563eb"}
                    onBlur={e  => e.target.style.borderColor = "#e2e8f0"}>
                    <option value="">Select product</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                  </select>
                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8", fontSize: 11 }}>▾</span>
                </div>
              </div>

              {/* Adjustment */}
              <div>
                <label style={labelStyle}>Adjustment (+/-) *</label>
                <input
                  style={{
                    ...inputStyle,
                    borderColor: adjustment > 0 ? "#0d9488" : adjustment < 0 ? "#dc2626" : "#e2e8f0",
                    background:  adjustment > 0 ? "#f0fdfa"  : adjustment < 0 ? "#fff5f5"  : "#fff",
                    color:       adjustment > 0 ? "#0d9488"  : adjustment < 0 ? "#dc2626"  : "#0f172a",
                    fontWeight: adjustment !== 0 ? 700 : 400,
                  }}
                  placeholder="e.g. +50 or -10"
                  type="number"
                  value={adjustForm.adjustment}
                  onChange={e => setAdjustForm(p => ({ ...p, adjustment: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = "#2563eb"}
                  onBlur={e  => e.target.style.borderColor = adjustment > 0 ? "#0d9488" : adjustment < 0 ? "#dc2626" : "#e2e8f0"}
                  required
                />
                {adjustment !== 0 && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 600, color: isPositive ? "#0d9488" : "#dc2626" }}>
                    {isPositive ? `▲ Adding ${adjustment} units` : `▼ Removing ${Math.abs(adjustment)} units`}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label style={labelStyle}>Reason *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. damaged, restock, returned"
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm(p => ({ ...p, reason: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = "#2563eb"}
                  onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
                  required
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label style={labelStyle}>Expiry Date</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={adjustForm.expiryDate}
                  onChange={e => setAdjustForm(p => ({ ...p, expiryDate: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = "#2563eb"}
                  onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
                />
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>Leave blank if no expiry</p>
              </div>
            </div>

            <button type="submit" disabled={saving} style={{
              padding: "10px 28px", borderRadius: 9, border: "none",
              background: saving ? "#93c5fd" : "#2563eb", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#1d4ed8"; }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "#2563eb"; }}>
              {saving ? "Adjusting…" : "Adjust Stock"}
            </button>
          </form>
        </div>
      )}

      {/* ── Inventory table ───────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
        overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        {/* Toolbar */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Stock Levels</span>
            {/* Filter pills */}
            {[
              ["all", "All", "#2563eb"],
              ["out", "Out of Stock", "#dc2626"],
              ["expiring", "Expiring", "#d97706"],
              ["expired", "Expired", "#dc2626"],
              ["low", "Low Stock", "#d97706"],
            ].map(([val, label, color]) => (
              <button key={val} onClick={() => setFilter(val)} style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                border: `1.5px solid ${filter === val ? color : "#e2e8f0"}`,
                background: filter === val ? `${color}12` : "#fff",
                color: filter === val ? color : "#94a3b8",
                cursor: "pointer", transition: "all 0.15s",
              }}>
                {label}
              </button>
            ))}
          </div>

          <input
            style={{ padding: "7px 12px", borderRadius: 8, fontSize: 13, border: "1.5px solid #e2e8f0", outline: "none", color: "#0f172a", width: 200, background: "#f8fafc" }}
            placeholder="Search product…"
            value={search} onChange={e => setSearch(e.target.value)}
            onFocus={e => e.target.style.borderColor = "#2563eb"}
            onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading inventory…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
              {search || filter !== "all" ? "No items match your filter" : "No inventory yet"}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              {search || filter !== "all" ? "Try clearing the search or filter" : "Adjust stock above to add inventory"}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["#", "Product", "SKU", "Quantity", "Expiry Date", "Status"].map(h => (
                    <th key={h} style={{
                      padding: "10px 18px", textAlign: h === "Quantity" ? "center" : "left",
                      fontSize: 11, fontWeight: 700, color: "#64748b",
                      letterSpacing: 0.5, textTransform: "uppercase",
                      borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => <InventoryRow key={row._id || i} row={row} index={i} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const InventoryRow = ({ row, index }) => {
  const [hovered, setHovered] = useState(false);

  const expiryBadge = () => {
    if (!row.expiryDate) return <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>;
    const date = new Date(row.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    if (row.isExpired)
      return <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(220,38,38,0.09)", color: "#dc2626" }}>Expired · {date}</span>;
    if (row.isExpiringSoon)
      return <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(217,119,6,0.09)", color: "#d97706" }}>Soon · {date}</span>;
    return <span style={{ fontSize: 12, color: "#475569" }}>{date}</span>;
  };

  const statusBadge = () => {
    if (row.outOfStock) return { label: "Out of Stock", color: "#dc2626", bg: "rgba(220,38,38,0.09)" };
    if (row.lowStock)   return { label: "Low Stock",    color: "#d97706", bg: "rgba(217,119,6,0.09)"  };
    return                     { label: "Available",    color: "#0d9488", bg: "rgba(13,148,136,0.09)" };
  };
  const s = statusBadge();

  const qtyColor = row.outOfStock ? "#dc2626" : row.lowStock ? "#d97706" : "#0d9488";

  return (
    <tr style={{ borderBottom: "1px solid #f8fafc", background: hovered ? "#f8fafc" : "transparent", transition: "background 0.12s" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      <td style={{ padding: "12px 18px", fontSize: 12, color: "#94a3b8" }}>{index + 1}</td>

      <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
        {row.product?.name || "—"}
      </td>

      <td style={{ padding: "12px 18px", fontSize: 12, color: "#64748b", fontFamily: "monospace", letterSpacing: 0.3 }}>
        {row.product?.sku || "—"}
      </td>

      <td style={{ padding: "12px 18px", textAlign: "center" }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: qtyColor }}>{row.quantity ?? 0}</span>
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>units</span>
      </td>

      <td style={{ padding: "12px 18px" }}>{expiryBadge()}</td>

      <td style={{ padding: "12px 18px" }}>
        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
          {s.label}
        </span>
      </td>
    </tr>
  );
};

export default InventoryPage;