// hms-react/src/pages/ProductsPage.jsx
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import usePermissions from "../hooks/usePermissions";
import { createProduct, fetchProducts, getProductBarcode, getProductQr } from "../services/productService";
import { fetchInventory } from "../services/inventoryService";
import { currency } from "../utils/format";

const initialForm = { name: "", sku: "", mrpPrice: "", costPrice: "", price: "", description: "" };
const numberFields = new Set(["mrpPrice", "costPrice", "price"]);
const SORT_OPTIONS = [
  { value: "asc",      label: "Expiry: Earliest first" },
  { value: "desc",     label: "Expiry: Latest first" },
  { value: "none",     label: "No sorting" },
  { value: "noexpiry", label: "No expiry date only" },
];

const inputStyle = (err = false) => ({
  width: "100%", padding: "9px 12px", borderRadius: 9, fontSize: 13,
  border: `1.5px solid ${err ? "#fca5a5" : "#e2e8f0"}`,
  background: err ? "#fff5f5" : "#fff", outline: "none",
  color: "#0f172a", boxSizing: "border-box", transition: "border-color 0.15s",
});
const labelStyle = {
  fontSize: 11, fontWeight: 600, color: "#64748b",
  textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5,
};

const FIELD_CONFIG = [
  { key: "name",        label: "Product Name *",        type: "text",   span: 2 },
  { key: "sku",         label: "SKU / Code (e.g. MED-001) *", type: "text", span: 1 },
  { key: "mrpPrice",    label: "MRP Price (₹) *",       type: "number", span: 1 },
  { key: "costPrice",   label: "Purchase Price (₹) *",  type: "number", span: 1 },
  { key: "price",       label: "Selling Price (₹) *",   type: "number", span: 1 },
  { key: "description", label: "Description",           type: "text",   span: 3 },
];

export default function ProductsPage() {
  const { canWriteProducts } = usePermissions();
  const [products,   setProducts]   = useState([]);
  const [form,       setForm]       = useState(initialForm);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [qrModal,    setQrModal]    = useState(null);
  const [search,     setSearch]     = useState("");
  const [expirySort, setExpirySort] = useState("asc");
  const formRef = useRef(null);

  const handleEnter = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const fields = Array.from(formRef.current.querySelectorAll("input, textarea, button")).filter(el => !el.disabled);
    const idx = fields.indexOf(e.target);
    if (idx < fields.length - 1) fields[idx + 1].focus();
    else onCreate(e);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [productData, inventoryData] = await Promise.all([fetchProducts(), fetchInventory()]);
      const productList   = productData.data   || [];
      const inventoryList = inventoryData.data || [];
      const inventoryMap  = {};
      for (const inv of inventoryList) {
        const pid = inv.product?._id || inv.productId;
        if (!pid) continue;
        if (!inventoryMap[pid]) { inventoryMap[pid] = inv; }
        else {
          const existing = inventoryMap[pid].expiryDate;
          const current  = inv.expiryDate;
          if (current && (!existing || new Date(current) < new Date(existing))) inventoryMap[pid] = inv;
        }
      }
      setProducts(productList.map(p => {
        const inv = inventoryMap[p._id];
        return { ...p, expiryDate: inv?.expiryDate ?? null, isExpired: inv?.isExpired ?? false, isExpiringSoon: inv?.isExpiringSoon ?? false, inventory: inv ?? p.inventory };
      }));
    } catch { toast.error("Failed to load products"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadProducts(); }, []);

  const onCreate = async (event) => {
    event.preventDefault();
    if (/^\d+$/.test(form.sku.trim())) { toast.error("SKU should be a code like MED-001, not just a number."); return; }
    setSaving(true);
    try {
      await createProduct({ name: form.name.trim(), sku: form.sku.trim(), mrpPrice: Number(form.mrpPrice), costPrice: Number(form.costPrice), price: Number(form.price), description: form.description.trim(), category: "General" });
      toast.success("Product added!");
      setForm(initialForm);
      await loadProducts();
    } catch (err) { toast.error(err?.response?.data?.message || "Failed to create product"); }
    finally { setSaving(false); }
  };

  const openQr = async (product) => {
    try { const data = await getProductQr(product._id); setQrModal({ type: "qr", src: data.qrDataUrl, name: product.name }); }
    catch { toast.error("Could not load QR code"); }
  };
  const openBarcode = async (product) => {
    try { const src = await getProductBarcode(product._id); setQrModal({ type: "barcode", src, name: product.name }); }
    catch { toast.error("Could not load barcode"); }
  };

  const searched = products.filter(p => {
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || String(p.mrpPrice).includes(q) || String(p.price).includes(q);
  });

  const sorted = [...searched].sort((a, b) => {
    if (expirySort === "none") return 0;
    const ea = a.expiryDate, eb = b.expiryDate;
    if (expirySort === "noexpiry") { if (!ea && !eb) return 0; if (!ea) return -1; if (!eb) return 1; return 0; }
    if (expirySort === "asc")  { if (!ea && !eb) return 0; if (!ea) return 1; if (!eb) return -1; return new Date(ea) - new Date(eb); }
    if (expirySort === "desc") { if (!ea && !eb) return 0; if (!ea) return 1; if (!eb) return -1; return new Date(eb) - new Date(ea); }
    return 0;
  });

  const expiredCount  = products.filter(p => p.isExpired).length;
  const expiringCount = products.filter(p => p.isExpiringSoon && !p.isExpired).length;

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1150, margin: "0 auto" }}>

      {/* ── QR / Barcode modal ────────────────────────────────────── */}
      {qrModal && (
        <div onClick={() => setQrModal(null)} style={{
          position: "fixed", inset: 0, zIndex: 50, display: "flex",
          alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: 16, padding: 28,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center", minWidth: 280,
          }}>
            <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              {qrModal.type === "qr" ? "QR Code" : "Barcode"} — {qrModal.name}
            </p>
            <img src={qrModal.src} alt="code" style={{ maxWidth: 240, margin: "0 auto", display: "block" }} />
            <button onClick={() => setQrModal(null)} style={{
              marginTop: 16, width: "100%", padding: "10px", borderRadius: 9, border: "none",
              background: "#0f2942", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Page header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: -0.4 }}>Products</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Manage your medicine and product catalogue</p>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Products", value: products.length,  accent: "#2563eb" },
          { label: "Expired",        value: expiredCount,     accent: expiredCount  > 0 ? "#dc2626" : "#94a3b8" },
          { label: "Expiring Soon",  value: expiringCount,    accent: expiringCount > 0 ? "#d97706" : "#94a3b8" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.accent, marginTop: 6, letterSpacing: -0.5 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Add product form ──────────────────────────────────────── */}
      {canWriteProducts && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", padding: "20px 22px", marginBottom: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          <h2 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Add New Product</h2>
          <form ref={formRef} onSubmit={onCreate}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
              {FIELD_CONFIG.map(({ key, label, type, span }) => (
                <div key={key} style={{ gridColumn: `span ${span}` }}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    style={inputStyle()}
                    placeholder={type === "number" ? "0.00" : label.replace(" *", "")}
                    type={type}
                    min={numberFields.has(key) ? "0" : undefined}
                    step={numberFields.has(key) ? "0.01" : undefined}
                    value={form[key]}
                    onKeyDown={handleEnter}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = "#2563eb"}
                    onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
                    required={key !== "description"}
                  />
                </div>
              ))}
            </div>
            <button type="submit" disabled={saving} style={{
              padding: "10px 28px", borderRadius: 9, border: "none",
              background: saving ? "#93c5fd" : "#2563eb", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", transition: "background 0.15s",
            }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#1d4ed8"; }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "#2563eb"; }}>
              {saving ? "Adding…" : "＋ Add Product"}
            </button>
          </form>
        </div>
      )}

      {/* ── Products table ────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        {/* Toolbar */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>All Products</span>
            <span style={{ padding: "2px 8px", borderRadius: 20, background: "rgba(37,99,235,0.08)", color: "#2563eb", fontSize: 11, fontWeight: 600 }}>{sorted.length}</span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <input
                style={{ padding: "7px 12px 7px 32px", borderRadius: 8, fontSize: 13, border: "1.5px solid #e2e8f0", outline: "none", color: "#0f172a", width: 200, background: "#f8fafc" }}
                placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
              />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 13 }}>🔍</span>
              {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>✕</button>}
            </div>
            <div style={{ position: "relative" }}>
              <select value={expirySort} onChange={e => setExpirySort(e.target.value)} style={{ ...inputStyle(), width: "auto", paddingRight: 28, fontSize: 12 }}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e  => e.target.style.borderColor = "#e2e8f0"}>
                {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8", fontSize: 11 }}>▾</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading products…</div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>💊</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>{search ? "No products match your search" : "No products yet"}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{search ? "Try a different name or SKU" : "Add your first product using the form above"}</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["#","Product","SKU","MRP","Purchase","Selling","Stock","Expiry","Codes"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: ["MRP","Purchase","Selling","Stock"].includes(h) ? "right" : "left", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.5, textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => <ProductRow key={row._id || i} row={row} index={i} onQr={openQr} onBarcode={openBarcode} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductRow({ row, index, onQr, onBarcode }) {
  const [hovered, setHovered] = useState(false);
  const qty   = row.inventory?.quantity ?? 0;
  const isOut = qty === 0;
  const isLow = qty > 0 && qty <= 5;

  const expiryCell = () => {
    if (!row.expiryDate) return <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>;
    const date = new Date(row.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
    if (row.isExpired)      return <span style={{ padding: "2px 7px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: "rgba(220,38,38,0.09)", color: "#dc2626" }}>Expired · {date}</span>;
    if (row.isExpiringSoon) return <span style={{ padding: "2px 7px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: "rgba(217,119,6,0.09)", color: "#d97706" }}>Soon · {date}</span>;
    return <span style={{ fontSize: 12, color: "#475569" }}>{date}</span>;
  };

  return (
    <tr style={{ borderBottom: "1px solid #f8fafc", background: hovered ? "#f8fafc" : "transparent", transition: "background 0.12s" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <td style={{ padding: "11px 14px", fontSize: 12, color: "#94a3b8" }}>{index + 1}</td>
      <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{row.name}</td>
      <td style={{ padding: "11px 14px", fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>{row.sku}</td>
      <td style={{ padding: "11px 14px", fontSize: 13, color: "#475569", textAlign: "right" }}>{currency(row.mrpPrice)}</td>
      <td style={{ padding: "11px 14px", fontSize: 13, color: "#475569", textAlign: "right" }}>{currency(row.costPrice)}</td>
      <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#0d9488", textAlign: "right" }}>{currency(row.price)}</td>
      <td style={{ padding: "11px 14px", textAlign: "right" }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: isOut ? "#dc2626" : isLow ? "#d97706" : "#0d9488" }}>{qty}</span>
      </td>
      <td style={{ padding: "11px 14px" }}>{expiryCell()}</td>
      <td style={{ padding: "11px 14px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onQr(row)} style={{ padding: "3px 9px", borderRadius: 7, border: "none", background: "rgba(13,148,136,0.1)", color: "#0d9488", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>QR</button>
          <button onClick={() => onBarcode(row)} style={{ padding: "3px 9px", borderRadius: 7, border: "none", background: "rgba(15,41,66,0.08)", color: "#0f2942", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Barcode</button>
        </div>
      </td>
    </tr>
  );
}