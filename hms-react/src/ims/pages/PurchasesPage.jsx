// hms-react/src/pages/PurchasesPage.jsx
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchSuppliers } from "../services/supplierService";
import { fetchProducts } from "../services/productService";
import { createPurchase, fetchPurchases } from "../services/purchaseService";
import { currency } from "../utils/format";

const selectStyle = (highlight = false) => ({
  width: "100%", padding: "9px 12px", borderRadius: 9, fontSize: 13,
  border: `1.5px solid ${highlight ? "#0d9488" : "#e2e8f0"}`,
  background: highlight ? "#f0fdfa" : "#fff",
  outline: "none", color: "#0f172a", boxSizing: "border-box",
  appearance: "none", cursor: "pointer", transition: "border-color 0.15s",
});

const inputStyle = () => ({
  width: "100%", padding: "9px 12px", borderRadius: 9, fontSize: 13,
  border: "1.5px solid #e2e8f0", background: "#fff",
  outline: "none", color: "#0f172a", boxSizing: "border-box",
  transition: "border-color 0.15s",
});

const labelStyle = {
  fontSize: 11, fontWeight: 600, color: "#64748b",
  textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5,
};

const PurchasesPage = () => {
  const [rows,      setRows]      = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [adding,    setAdding]    = useState(false);
  const [search,    setSearch]    = useState("");
  const [form, setForm] = useState({
    supplierId: "", productId: "", quantity: "",
    unitCost: "", billType: "non-gst", gstNumber: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPurchases();
      setRows(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetchSuppliers().then(d => setSuppliers(d.data || []));
    fetchProducts().then(d => setProducts(d.data || []));
  }, []);

  const handleProductChange = (e) => {
    const selectedId = e.target.value;
    const prod = products.find(p => p._id === selectedId);
    setForm(prev => ({ ...prev, productId: selectedId, unitCost: prod ? prod.costPrice : "" }));
  };

  const handleBillTypeChange = (e) => {
    setForm(prev => ({
      ...prev, billType: e.target.value,
      gstNumber: e.target.value === "non-gst" ? "" : prev.gstNumber,
    }));
  };

  const onCreate = async (event) => {
    event.preventDefault();
    if (form.billType === "gst" && !form.gstNumber.trim()) {
      toast.error("Please enter GST number for GST bill");
      return;
    }
    setAdding(true);
    try {
      await createPurchase({
        supplierId: form.supplierId,
        items: [{ productId: form.productId, quantity: Number(form.quantity), unitCost: Number(form.unitCost) }],
        billType: form.billType,
        gstNumber: form.billType === "gst" ? form.gstNumber.trim().toUpperCase() : "",
      });
      toast.success("Purchase created & stock updated");
      setForm({ supplierId: "", productId: "", quantity: "", unitCost: "", billType: "non-gst", gstNumber: "" });
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create purchase");
    } finally {
      setAdding(false);
    }
  };

  const tableRows = rows.flatMap((purchase) =>
    (purchase.items || []).map((item, idx) => ({
      _id: `${purchase._id}-${idx}`,
      supplierName: purchase.supplier?.name || "—",
      productName:  item.product?.name      || "—",
      quantity:     item.quantity,
      unitCost:     item.unitCost,
      lineTotal:    item.lineTotal,
      billType:     purchase.billType  || "non-gst",
      gstNumber:    purchase.gstNumber || "",
      date:         purchase.createdAt,
    }))
  );

  const filtered = tableRows.filter(r =>
    r.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    r.productName.toLowerCase().includes(search.toLowerCase()) ||
    r.gstNumber.toLowerCase().includes(search.toLowerCase())
  );

  // Summary
  const totalSpend = tableRows.reduce((s, r) => s + (r.lineTotal || 0), 0);
  const gstCount   = tableRows.filter(r => r.billType === "gst").length;

  // Computed line total preview
  const previewTotal = form.quantity && form.unitCost
    ? Number(form.quantity) * Number(form.unitCost)
    : null;

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: -0.4 }}>
          Purchases
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
          Record stock purchases from suppliers
        </p>
      </div>

      {/* ── Summary stats ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Purchases",  value: tableRows.length, fmt: v => v,       accent: "#2563eb" },
          { label: "Total Spend",      value: totalSpend,        fmt: currency,     accent: "#7c3aed" },
          { label: "GST Bills",        value: gstCount,          fmt: v => v,       accent: "#0d9488" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0",
            padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.accent, marginTop: 6, letterSpacing: -0.5 }}>
              {s.fmt(s.value)}
            </div>
          </div>
        ))}
      </div>

      {/* ── Create purchase form ──────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
        padding: "20px 22px", marginBottom: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        <h2 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Create New Purchase
        </h2>

        <form onSubmit={onCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 16 }}>

            {/* Supplier */}
            <div>
              <label style={labelStyle}>Supplier *</label>
              <div style={{ position: "relative" }}>
                <select
                  value={form.supplierId}
                  onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))}
                  style={selectStyle()}
                  required
                  onFocus={e => e.target.style.borderColor = "#2563eb"}
                  onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8", fontSize: 11 }}>▾</span>
              </div>
            </div>

            {/* Product */}
            <div>
              <label style={labelStyle}>Product *</label>
              <div style={{ position: "relative" }}>
                <select
                  value={form.productId}
                  onChange={handleProductChange}
                  style={selectStyle()}
                  required
                  onFocus={e => e.target.style.borderColor = "#2563eb"}
                  onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
                >
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8", fontSize: 11 }}>▾</span>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label style={labelStyle}>Quantity *</label>
              <input
                style={inputStyle()}
                placeholder="e.g. 100"
                type="number" min="1"
                value={form.quantity}
                onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
                required
              />
            </div>

            {/* Unit cost */}
            <div>
              <label style={labelStyle}>Unit Cost (₹) *</label>
              <input
                style={inputStyle()}
                placeholder="0.00"
                type="number" min="0" step="0.01"
                value={form.unitCost}
                onChange={e => setForm(p => ({ ...p, unitCost: e.target.value }))}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
                required
              />
              {previewTotal !== null && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>
                  Line total: {currency(previewTotal)}
                </p>
              )}
            </div>

            {/* Bill type */}
            <div>
              <label style={labelStyle}>Bill Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["non-gst", "gst"].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleBillTypeChange({ target: { value: type } })}
                    style={{
                      flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${form.billType === type ? (type === "gst" ? "#0d9488" : "#2563eb") : "#e2e8f0"}`,
                      background: form.billType === type ? (type === "gst" ? "#f0fdfa" : "#eff6ff") : "#fff",
                      color: form.billType === type ? (type === "gst" ? "#0d9488" : "#2563eb") : "#94a3b8",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {type === "gst" ? "GST Bill" : "Non-GST"}
                  </button>
                ))}
              </div>
            </div>

            {/* GST number */}
            <div>
              <label style={labelStyle}>GST Number {form.billType === "gst" ? "*" : ""}</label>
              {form.billType === "gst" ? (
                <input
                  style={{ ...inputStyle(), borderColor: "#0d9488", background: "#f0fdfa", textTransform: "uppercase", letterSpacing: 1, fontFamily: "monospace" }}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={form.gstNumber}
                  onChange={e => setForm(p => ({ ...p, gstNumber: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = "#0d9488"}
                  onBlur={e  => e.target.style.borderColor = "#0d9488"}
                  maxLength={15}
                  required
                />
              ) : (
                <div style={{
                  padding: "9px 12px", borderRadius: 9, fontSize: 13,
                  border: "1.5px solid #f1f5f9", background: "#f8fafc",
                  color: "#94a3b8", fontStyle: "italic",
                }}>
                  Not required
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={adding}
            style={{
              padding: "10px 28px", borderRadius: 9, border: "none",
              background: adding ? "#93c5fd" : "#2563eb", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: adding ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { if (!adding) e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => { if (!adding) e.currentTarget.style.background = "#2563eb"; }}
          >
            {adding ? "Creating…" : "＋ Create Purchase"}
          </button>
        </form>
      </div>

      {/* ── Purchases table ───────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
        overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        {/* Toolbar */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Purchase History</span>
            <span style={{
              marginLeft: 8, padding: "2px 8px", borderRadius: 20,
              background: "rgba(37,99,235,0.08)", color: "#2563eb", fontSize: 11, fontWeight: 600,
            }}>
              {tableRows.length} entries
            </span>
          </div>
          <input
            style={{
              padding: "7px 12px", borderRadius: 8, fontSize: 13,
              border: "1.5px solid #e2e8f0", outline: "none",
              color: "#0f172a", width: 220, background: "#f8fafc",
            }}
            placeholder="Search purchases…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={e => e.target.style.borderColor = "#2563eb"}
            onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
          />
        </div>

        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            Loading purchases…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🛒</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
              {search ? "No purchases match your search" : "No purchases yet"}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Create your first purchase using the form above
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["#", "Supplier", "Product", "Qty", "Unit Price", "Line Total", "Bill Type", "Date"].map(h => (
                    <th key={h} style={{
                      padding: "10px 16px", textAlign: ["Qty","Unit Price","Line Total"].includes(h) ? "right" : "left",
                      fontSize: 11, fontWeight: 700, color: "#64748b",
                      letterSpacing: 0.5, textTransform: "uppercase",
                      borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <PurchaseRow key={row._id} row={row} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const PurchaseRow = ({ row, index }) => {
  const [hovered, setHovered] = useState(false);
  const isGst = row.billType === "gst" && row.gstNumber;

  return (
    <tr
      style={{
        borderBottom: "1px solid #f8fafc",
        background: hovered ? "#f8fafc" : "transparent",
        transition: "background 0.12s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={{ padding: "11px 16px", fontSize: 12, color: "#94a3b8" }}>{index + 1}</td>

      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
        {row.supplierName}
      </td>

      <td style={{ padding: "11px 16px", fontSize: 13, color: "#334155" }}>
        {row.productName}
      </td>

      <td style={{ padding: "11px 16px", fontSize: 13, color: "#475569", textAlign: "right", fontWeight: 500 }}>
        {row.quantity}
      </td>

      <td style={{ padding: "11px 16px", fontSize: 13, color: "#475569", textAlign: "right" }}>
        {currency(row.unitCost)}
      </td>

      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: "#7c3aed", textAlign: "right" }}>
        {currency(row.lineTotal)}
      </td>

      <td style={{ padding: "11px 16px" }}>
        {isGst ? (
          <div>
            <span style={{
              display: "inline-block", padding: "2px 8px", borderRadius: 20,
              background: "rgba(13,148,136,0.09)", color: "#0d9488",
              fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
            }}>
              GST
            </span>
            <span style={{ display: "block", fontSize: 11, color: "#64748b", fontFamily: "monospace", marginTop: 2 }}>
              {row.gstNumber}
            </span>
          </div>
        ) : (
          <span style={{
            display: "inline-block", padding: "2px 8px", borderRadius: 20,
            background: "#f1f5f9", color: "#94a3b8",
            fontSize: 10, fontWeight: 600,
          }}>
            Non-GST
          </span>
        )}
      </td>

      <td style={{ padding: "11px 16px", fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
        {new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </td>
    </tr>
  );
};

export default PurchasesPage;