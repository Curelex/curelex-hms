// hms-react/src/pages/SuppliersPage.jsx
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { createSupplier, fetchSuppliers } from "../services/supplierService";

const SuppliersPage = () => {
  const [rows,    setRows]    = useState([]);
  const [form,    setForm]    = useState({ name: "", phone: "", email: "" });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [search,  setSearch]  = useState("");
  const formRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchSuppliers();
      setRows(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim())                                           e.name  = "Name is required";
    if (!form.phone.trim())                                          e.phone = "Phone is required";
    else if (!/^\d{10}$/.test(form.phone.trim()))                   e.phone = "Must be exactly 10 digits";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onCreate = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setAdding(true);
    try {
      await createSupplier(form);
      toast.success("Supplier added!");
      setForm({ name: "", phone: "", email: "" });
      setErrors({});
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add supplier");
    } finally {
      setAdding(false);
    }
  };

  const handleEnter = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const fields = Array.from(formRef.current.querySelectorAll("input, button")).filter(el => !el.disabled);
    const idx = fields.indexOf(e.target);
    if (idx < fields.length - 1) fields[idx + 1].focus();
    else onCreate(e);
  };

  const onPhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm(p => ({ ...p, phone: val }));
    if (errors.phone) setErrors(p => ({ ...p, phone: "" }));
  };

  const filtered = rows.filter(r =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.phone?.includes(search) ||
    r.email?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputStyle = (field) => ({
    width: "100%", padding: "9px 12px", borderRadius: 9, fontSize: 13,
    border: `1.5px solid ${errors[field] ? "#fca5a5" : "#e2e8f0"}`,
    background: errors[field] ? "#fff5f5" : "#fff",
    outline: "none", color: "#0f172a", boxSizing: "border-box",
    transition: "border-color 0.15s",
  });

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1000, margin: "0 auto" }}>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: -0.4 }}>
          Suppliers
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
          Manage your medicine and product suppliers
        </p>
      </div>

      {/* ── Add supplier card ─────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
        padding: "20px 22px", marginBottom: 24,
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Add New Supplier
        </h2>

        <form ref={formRef} onSubmit={onCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>

            {/* Name */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Supplier Name *
              </label>
              <input
                style={{ ...inputStyle("name"), marginTop: 5 }}
                placeholder="e.g. MedLine Pharma"
                value={form.name}
                onKeyDown={handleEnter}
                onChange={e => {
                  setForm(p => ({ ...p, name: e.target.value }));
                  if (errors.name) setErrors(p => ({ ...p, name: "" }));
                }}
                onFocus={e => e.target.style.borderColor = errors.name ? "#f87171" : "#2563eb"}
                onBlur={e  => e.target.style.borderColor = errors.name ? "#fca5a5" : "#e2e8f0"}
              />
              {errors.name && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444" }}>{errors.name}</p>}
            </div>

            {/* Phone */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Phone *
              </label>
              <input
                style={{ ...inputStyle("phone"), marginTop: 5 }}
                placeholder="10-digit number"
                value={form.phone}
                inputMode="numeric"
                maxLength={10}
                onKeyDown={handleEnter}
                onChange={onPhoneChange}
                onFocus={e => e.target.style.borderColor = errors.phone ? "#f87171" : "#2563eb"}
                onBlur={e  => e.target.style.borderColor = errors.phone ? "#fca5a5" : "#e2e8f0"}
              />
              {errors.phone
                ? <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444" }}>{errors.phone}</p>
                : <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>{form.phone.length}/10 digits</p>
              }
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Email
              </label>
              <input
                style={{ ...inputStyle("email"), marginTop: 5 }}
                placeholder="supplier@example.com"
                type="email"
                value={form.email}
                onKeyDown={handleEnter}
                onChange={e => {
                  setForm(p => ({ ...p, email: e.target.value }));
                  if (errors.email) setErrors(p => ({ ...p, email: "" }));
                }}
                onFocus={e => e.target.style.borderColor = errors.email ? "#f87171" : "#2563eb"}
                onBlur={e  => e.target.style.borderColor = errors.email ? "#fca5a5" : "#e2e8f0"}
              />
              {errors.email && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444" }}>{errors.email}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={adding}
            style={{
              padding: "10px 24px", borderRadius: 9, border: "none",
              background: adding ? "#93c5fd" : "#2563eb", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: adding ? "not-allowed" : "pointer",
              transition: "background 0.15s", display: "inline-flex", alignItems: "center", gap: 6,
            }}
            onMouseEnter={e => { if (!adding) e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => { if (!adding) e.currentTarget.style.background = "#2563eb"; }}
          >
            {adding ? "Adding…" : "+ Add Supplier"}
          </button>
        </form>
      </div>

      {/* ── Suppliers table card ──────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
        overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        {/* Table toolbar */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>All Suppliers</span>
            <span style={{
              marginLeft: 8, padding: "2px 8px", borderRadius: 20,
              background: "rgba(37,99,235,0.08)", color: "#2563eb",
              fontSize: 11, fontWeight: 600,
            }}>
              {rows.length}
            </span>
          </div>

          {/* Search */}
          <input
            style={{
              padding: "7px 12px", borderRadius: 8, fontSize: 13,
              border: "1.5px solid #e2e8f0", outline: "none", color: "#0f172a",
              width: 220, background: "#f8fafc",
            }}
            placeholder="Search suppliers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={e => e.target.style.borderColor = "#2563eb"}
            onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            Loading suppliers…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏭</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
              {search ? "No suppliers match your search" : "No suppliers yet"}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              {search ? "Try a different name or phone number" : "Add your first supplier using the form above"}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["#", "Supplier Name", "Phone", "Email"].map(h => (
                    <th key={h} style={{
                      padding: "10px 18px", textAlign: "left",
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
                  <SupplierRow key={row._id || i} row={row} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Row with hover ────────────────────────────────────────────────────────────
const SupplierRow = ({ row, index }) => {
  const [hovered, setHovered] = useState(false);
  const initials = row.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const colors   = ["#2563eb","#7c3aed","#0d9488","#d97706","#dc2626","#0891b2"];
  const color    = colors[row.name?.charCodeAt(0) % colors.length] || "#2563eb";

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
      {/* # */}
      <td style={{ padding: "12px 18px", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
        {index + 1}
      </td>

      {/* Name with avatar */}
      <td style={{ padding: "12px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: `${color}18`, color, fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {initials}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{row.name}</span>
        </div>
      </td>

      {/* Phone */}
      <td style={{ padding: "12px 18px", fontSize: 13, color: "#475569", fontFamily: "monospace", letterSpacing: 0.3 }}>
        {row.phone || "—"}
      </td>

      {/* Email */}
      <td style={{ padding: "12px 18px", fontSize: 13, color: "#475569" }}>
        {row.email
          ? <a href={`mailto:${row.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>{row.email}</a>
          : <span style={{ color: "#cbd5e1" }}>—</span>
        }
      </td>
    </tr>
  );
};

export default SuppliersPage;