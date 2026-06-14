// hms-react/src/pages/SalesPage.jsx
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchCustomers } from "../services/customerService";
import { fetchProducts } from "../services/productService";
import {
  createSale, fetchSales, finalizeSale, cancelSale, downloadInvoiceUrl
} from "../services/salesService";
import { currency } from "../utils/format";

const EMPTY_ITEM = { productId: "", quantity: "" };

const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 9, fontSize: 13,
  border: "1.5px solid #e2e8f0", background: "#fff", outline: "none",
  color: "#0f172a", boxSizing: "border-box", transition: "border-color 0.15s",
};
const selectStyle = {
  ...inputStyle, appearance: "none", cursor: "pointer",
};
const labelStyle = {
  fontSize: 11, fontWeight: 600, color: "#64748b",
  textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5,
};

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Credit"];

export default function SalesPage() {
  const [sales,     setSales]     = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [creating,  setCreating]  = useState(false);

  const [customerId,    setCustomerId]    = useState("");
  const [walkInName,    setWalkInName]    = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [discountType,  setDiscountType]  = useState("percent");
  const [discountValue, setDiscountValue] = useState("0");
  const [items,         setItems]         = useState([{ ...EMPTY_ITEM }]);
  const [search,        setSearch]        = useState("");

  const getProduct = (id) => products.find(p => p._id === id) || null;
  const getStock   = (id) => { const p = getProduct(id); return p ? (p.inventory?.quantity ?? 0) : 0; };

  const addItemRow    = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItemRow = (idx) => setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      if (field === "quantity") {
        const stock = getStock(updated.productId);
        const qty   = Number(value);
        if (stock === 0) { toast.error(`"${getProduct(updated.productId)?.name}" has 0 stock.`); return { ...it, quantity: "" }; }
        if (qty > stock) { toast.error(`Only ${stock} units available.`); return { ...it, quantity: String(stock) }; }
      }
      if (field === "productId") updated.quantity = "";
      return updated;
    }));
  };

  const lineSubtotals = items.map(it => {
    const p = getProduct(it.productId);
    return p ? Number(p.price) * (Number(it.quantity) || 0) : 0;
  });
  const subtotal  = lineSubtotals.reduce((a, b) => a + b, 0);
  const discVal   = Math.max(Number(discountValue) || 0, 0);
  const discAmount = discountType === "percent"
    ? parseFloat(((subtotal * Math.min(discVal, 100)) / 100).toFixed(2))
    : parseFloat(Math.min(discVal, subtotal).toFixed(2));
  const billTotal     = parseFloat((subtotal - discAmount).toFixed(2));
  const hasValidItems = items.some(it => it.productId && Number(it.quantity) >= 1);

  const loadSales = async () => {
    setLoading(true);
    try { const data = await fetchSales(); setSales(data.data || []); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadSales();
    fetchCustomers().then(d => setCustomers(d.data || []));
    fetchProducts().then(d  => setProducts(d.data  || []));
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    const validItems = items.filter(it => it.productId && Number(it.quantity) >= 1);
    if (!validItems.length) { toast.error("Add at least one item"); return; }
    for (const it of validItems) {
      const stock = getStock(it.productId);
      if (Number(it.quantity) > stock) {
        toast.error(`Insufficient stock for "${getProduct(it.productId)?.name}". Available: ${stock}`);
        return;
      }
    }
    setCreating(true);
    try {
      await createSale({
        customerId: customerId || undefined,
        walkInName: walkInName.trim(),
        items: validItems.map(it => ({ productId: it.productId, quantity: Number(it.quantity) })),
        paymentMethod,
        discountAmount: discAmount,
      });
      toast.success("Sale draft created");
      setCustomerId(""); setWalkInName(""); setPaymentMethod("Cash");
      setDiscountType("percent"); setDiscountValue("0"); setItems([{ ...EMPTY_ITEM }]);
      await loadSales();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create sale");
    } finally { setCreating(false); }
  };

  const onFinalize = async (saleId) => {
    try { await finalizeSale(saleId); toast.success("Sale finalized"); await loadSales(); }
    catch (err) { toast.error(err?.response?.data?.message || "Failed to finalize"); }
  };

  const onCancel = async (saleId) => {
    if (!window.confirm("Cancel this draft sale?")) return;
    try { await cancelSale(saleId); toast.success("Sale cancelled"); await loadSales(); }
    catch (err) { toast.error(err?.response?.data?.message || "Failed to cancel"); }
  };

  const resolveCustomerName = (row) => row.customer?.name || row.walkInName || "Walk-in";
  const getSaleSubtotal     = (row) => (row.items || []).reduce((acc, it) => acc + Number(it.unitPrice) * Number(it.quantity), 0);
  const getSaleBillTotal    = (row) => parseFloat((getSaleSubtotal(row) - Number(row.discountAmount || 0)).toFixed(2));

  const filteredSales = sales.filter(s =>
    resolveCustomerName(s).toLowerCase().includes(search.toLowerCase()) ||
    (s.invoiceNo || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.paymentMethod || "").toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const finalizedSales = sales.filter(s => s.status === "finalized");
  const totalRevenue   = finalizedSales.reduce((acc, s) => acc + getSaleBillTotal(s), 0);
  const draftCount     = sales.filter(s => s.status === "draft").length;

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1150, margin: "0 auto" }}>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: -0.4 }}>Sales</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Create and manage pharmacy sales</p>
      </div>

      {/* ── Summary stats ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Sales",    value: sales.length,         fmt: v => v,    accent: "#2563eb" },
          { label: "Total Revenue",  value: totalRevenue,         fmt: currency,  accent: "#0d9488" },
          { label: "Pending Drafts", value: draftCount,           fmt: v => v,    accent: draftCount > 0 ? "#d97706" : "#94a3b8" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0",
            padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.accent, marginTop: 6, letterSpacing: -0.5 }}>{s.fmt(s.value)}</div>
          </div>
        ))}
      </div>

      {/* ── Create sale form ──────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
        padding: "20px 22px", marginBottom: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        <h2 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>New Sale</h2>

        <form onSubmit={onCreate}>
          {/* Row 1: Customer + Walk-in */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Customer</label>
              <div style={{ position: "relative" }}>
                <select value={customerId} onChange={e => { setCustomerId(e.target.value); if (e.target.value) setWalkInName(""); }}
                  style={selectStyle}
                  onFocus={e => e.target.style.borderColor = "#2563eb"}
                  onBlur={e  => e.target.style.borderColor = "#e2e8f0"}>
                  <option value="">Walk-in customer</option>
                  {customers.map(c => <option key={c._id} value={c._id}>{c.name}{c.phone ? ` (${c.phone})` : ""}</option>)}
                </select>
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8", fontSize: 11 }}>▾</span>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Walk-in Name</label>
              <input
                style={{ ...inputStyle, background: customerId ? "#f8fafc" : "#fff", color: customerId ? "#94a3b8" : "#0f172a" }}
                placeholder={customerId ? "Saved customer selected" : "Name (optional)"}
                value={walkInName}
                onChange={e => setWalkInName(e.target.value)}
                disabled={!!customerId}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>
          </div>

          {/* Row 2: Payment + Discount */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Payment Method</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PAYMENT_METHODS.map(m => (
                  <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                    style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${paymentMethod === m ? "#2563eb" : "#e2e8f0"}`,
                      background: paymentMethod === m ? "#eff6ff" : "#fff",
                      color: paymentMethod === m ? "#2563eb" : "#94a3b8",
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Discount Type</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[["percent","%"],["rupees","₹"]].map(([val, sym]) => (
                  <button key={val} type="button"
                    onClick={() => { setDiscountType(val); setDiscountValue("0"); }}
                    style={{
                      flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 13, fontWeight: 600,
                      border: `1.5px solid ${discountType === val ? "#7c3aed" : "#e2e8f0"}`,
                      background: discountType === val ? "#f5f3ff" : "#fff",
                      color: discountType === val ? "#7c3aed" : "#94a3b8",
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                    {sym} {val === "percent" ? "Percent" : "Rupees"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Discount Value</label>
              <div style={{ position: "relative" }}>
                <input
                  type="number" min="0" max={discountType === "percent" ? "100" : undefined} step="0.01"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 32 }}
                  onFocus={e => e.target.style.borderColor = "#7c3aed"}
                  onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
                />
                <span style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  pointerEvents: "none", color: "#7c3aed", fontWeight: 700, fontSize: 13,
                }}>
                  {discountType === "percent" ? "%" : "₹"}
                </span>
              </div>
            </div>
          </div>

          {/* Items list */}
          <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
            {/* Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 36px",
              gap: 10, background: "#f8fafc", padding: "8px 14px",
              fontSize: 11, fontWeight: 700, color: "#64748b",
              textTransform: "uppercase", letterSpacing: 0.5,
              borderBottom: "1px solid #f1f5f9",
            }}>
              <span>Product</span><span>Quantity</span><span />
            </div>

            {items.map((it, idx) => {
              const prod     = getProduct(it.productId);
              const qty      = Number(it.quantity) || 0;
              const lineAmt  = prod ? Number(prod.price) * qty : 0;
              const stock    = getStock(it.productId);
              const noStock  = !!it.productId && stock === 0;
              const lowStock = !!it.productId && stock > 0 && stock <= 5;

              return (
                <div key={idx} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 36px",
                  gap: 10, padding: "10px 14px", alignItems: "start",
                  borderBottom: idx < items.length - 1 ? "1px solid #f8fafc" : "none",
                }}>
                  <div>
                    <div style={{ position: "relative" }}>
                      <select value={it.productId} onChange={e => updateItem(idx, "productId", e.target.value)}
                        style={{ ...selectStyle, fontSize: 13 }}
                        onFocus={e => e.target.style.borderColor = "#2563eb"}
                        onBlur={e  => e.target.style.borderColor = "#e2e8f0"}>
                        <option value="">Select product</option>
                        {products.map(p => (
                          <option key={p._id} value={p._id}>{p.name} — {currency(p.price)} ({p.sku})</option>
                        ))}
                      </select>
                      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8", fontSize: 11 }}>▾</span>
                    </div>
                    {it.productId && (
                      <p style={{
                        margin: "4px 0 0", fontSize: 11, fontWeight: 600,
                        color: noStock ? "#ef4444" : lowStock ? "#d97706" : "#0d9488",
                      }}>
                        {noStock ? "❌ Out of stock" : lowStock ? `⚠️ Low: ${stock} left` : `✅ ${stock} available`}
                      </p>
                    )}
                    {prod && qty > 0 && (
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>
                        {currency(prod.price)} × {qty} = <strong style={{ color: "#475569" }}>{currency(lineAmt)}</strong>
                      </p>
                    )}
                  </div>

                  <div>
                    <input
                      type="number" min="1" max={stock || undefined} placeholder="Qty"
                      value={it.quantity} disabled={noStock}
                      onChange={e => updateItem(idx, "quantity", e.target.value)}
                      style={{
                        ...inputStyle,
                        borderColor: noStock ? "#fca5a5" : "#e2e8f0",
                        background: noStock ? "#fff5f5" : "#fff",
                        color: noStock ? "#94a3b8" : "#0f172a",
                        cursor: noStock ? "not-allowed" : "text",
                      }}
                      onFocus={e => { if (!noStock) e.target.style.borderColor = "#2563eb"; }}
                      onBlur={e  => { e.target.style.borderColor = noStock ? "#fca5a5" : "#e2e8f0"; }}
                    />
                    {it.productId && !noStock && (
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>Max: {stock}</p>
                    )}
                  </div>

                  <button type="button" onClick={() => removeItemRow(idx)} disabled={items.length === 1}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: "none",
                      background: items.length === 1 ? "transparent" : "rgba(239,68,68,0.08)",
                      color: items.length === 1 ? "#cbd5e1" : "#ef4444",
                      cursor: items.length === 1 ? "not-allowed" : "pointer",
                      fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 1,
                    }}>
                    ✕
                  </button>
                </div>
              );
            })}

            <div style={{ borderTop: "1px solid #f1f5f9", padding: "10px 14px" }}>
              <button type="button" onClick={addItemRow} style={{
                background: "none", border: "none", color: "#0d9488", fontSize: 13,
                fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> Add another item
              </button>
            </div>
          </div>

          {/* Live bill preview */}
          {hasValidItems && (
            <div style={{
              borderRadius: 10, border: "1.5px solid #e2e8f0",
              background: "#f8fafc", padding: "14px 18px", marginBottom: 14,
            }}>
              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Bill Preview
              </p>
              {items.map((it, idx) => {
                const prod = getProduct(it.productId);
                const qty  = Number(it.quantity) || 0;
                if (!prod || qty < 1) return null;
                return (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 4 }}>
                    <span>{prod.name} × {qty}</span>
                    <span>{currency(Number(prod.price) * qty)}</span>
                  </div>
                );
              })}
              <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 8, paddingTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 4 }}>
                  <span>Subtotal</span><span>{currency(subtotal)}</span>
                </div>
                {discAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#ef4444", marginBottom: 4 }}>
                    <span>Discount ({discountType === "percent" ? `${Math.min(discVal,100)}%` : `₹${discVal}`})</span>
                    <span>− {currency(discAmount)}</span>
                  </div>
                )}
              </div>
              <div style={{ borderTop: "1.5px solid #cbd5e1", marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Bill Total</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#0d9488", letterSpacing: -0.5 }}>{currency(billTotal)}</span>
              </div>
            </div>
          )}

          <button type="submit" disabled={creating} style={{
            width: "100%", padding: "11px", borderRadius: 9, border: "none",
            background: creating ? "#93c5fd" : "#2563eb", color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => { if (!creating) e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => { if (!creating) e.currentTarget.style.background = "#2563eb"; }}>
            {creating ? "Creating…" : "＋ Create Sale"}
          </button>
        </form>
      </div>

      {/* ── Sales table ───────────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
        overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Sales History</span>
            <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 20, background: "rgba(37,99,235,0.08)", color: "#2563eb", fontSize: 11, fontWeight: 600 }}>
              {sales.length}
            </span>
          </div>
          <input
            style={{ padding: "7px 12px", borderRadius: 8, fontSize: 13, border: "1.5px solid #e2e8f0", outline: "none", color: "#0f172a", width: 220, background: "#f8fafc" }}
            placeholder="Search by invoice, customer…"
            value={search} onChange={e => setSearch(e.target.value)}
            onFocus={e => e.target.style.borderColor = "#2563eb"}
            onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
          />
        </div>

        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading sales…</div>
        ) : filteredSales.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>💰</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
              {search ? "No sales match your search" : "No sales yet"}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Create your first sale using the form above</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Invoice","Customer","Payment","Status","Items","Subtotal","Discount","Bill Total","Actions"].map(h => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: ["Subtotal","Discount","Bill Total"].includes(h) ? "right" : "left",
                      fontSize: 11, fontWeight: 700, color: "#64748b",
                      letterSpacing: 0.5, textTransform: "uppercase",
                      borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((row, i) => <SaleRow key={row._id || i} row={row} onFinalize={onFinalize} onCancel={onCancel} resolveCustomerName={resolveCustomerName} getSaleSubtotal={getSaleSubtotal} getSaleBillTotal={getSaleBillTotal} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SaleRow({ row, onFinalize, onCancel, resolveCustomerName, getSaleSubtotal, getSaleBillTotal }) {
  const [hovered, setHovered] = useState(false);
  const statusConfig = {
    finalized: { label: "Finalized", color: "#0d9488", bg: "rgba(13,148,136,0.09)" },
    cancelled: { label: "Cancelled", color: "#dc2626", bg: "rgba(220,38,38,0.09)" },
    draft:     { label: "Draft",     color: "#d97706", bg: "rgba(217,119,6,0.09)"  },
  };
  const sc = statusConfig[row.status] || { label: row.status, color: "#64748b", bg: "#f1f5f9" };

  return (
    <tr style={{ borderBottom: "1px solid #f8fafc", background: hovered ? "#f8fafc" : "transparent", transition: "background 0.12s" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      <td style={{ padding: "11px 14px", fontSize: 12, fontFamily: "monospace", color: "#475569", fontWeight: 600 }}>{row.invoiceNo || "—"}</td>

      <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{resolveCustomerName(row)}</td>

      <td style={{ padding: "11px 14px" }}>
        <span style={{
          padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: row.paymentMethod === "Cash" ? "rgba(37,99,235,0.08)" : row.paymentMethod === "UPI" ? "rgba(124,58,237,0.08)" : "rgba(13,148,136,0.08)",
          color: row.paymentMethod === "Cash" ? "#2563eb" : row.paymentMethod === "UPI" ? "#7c3aed" : "#0d9488",
        }}>
          {row.paymentMethod}
        </span>
      </td>

      <td style={{ padding: "11px 14px" }}>
        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>
          {sc.label}
        </span>
      </td>

      <td style={{ padding: "11px 14px", fontSize: 12, color: "#64748b" }}>
        {(row.items || []).map((it, i) => (
          <div key={i}>{it.name} × {it.quantity}</div>
        ))}
      </td>

      <td style={{ padding: "11px 14px", fontSize: 13, color: "#475569", textAlign: "right" }}>{currency(getSaleSubtotal(row))}</td>

      <td style={{ padding: "11px 14px", fontSize: 13, color: "#ef4444", textAlign: "right" }}>
        {row.discountAmount > 0 ? `− ${currency(row.discountAmount)}` : <span style={{ color: "#cbd5e1" }}>—</span>}
      </td>

      <td style={{ padding: "11px 14px", textAlign: "right" }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#0d9488" }}>{currency(getSaleBillTotal(row))}</span>
      </td>

      <td style={{ padding: "11px 14px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {row.status === "draft" && (
            <>
              <button onClick={() => onFinalize(row._id)} style={{
                padding: "4px 10px", borderRadius: 7, border: "none",
                background: "#0d9488", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>Finalize</button>
              <button onClick={() => onCancel(row._id)} style={{
                padding: "4px 10px", borderRadius: 7, border: "none",
                background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>Cancel</button>
            </>
          )}
          {row.status === "finalized" && (
            <a href={downloadInvoiceUrl(row._id)} target="_blank" rel="noreferrer" style={{
              padding: "4px 10px", borderRadius: 7,
              background: "#1e293b", color: "#fff", fontSize: 11, fontWeight: 600,
              textDecoration: "none", display: "inline-block",
            }}>PDF</a>
          )}
        </div>
      </td>
    </tr>
  );
}