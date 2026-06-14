// hms-react/src/pages/CustomersPage.jsx
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { createCustomer, fetchCustomers } from "../services/customerService";
import { currency } from "../utils/format";

const CustomersPage = () => {
  const [rows,    setRows]    = useState([]);
  const [form,    setForm]    = useState({ name: "", phone: "", email: "", creditLimit: "" });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [search,  setSearch]  = useState("");
  const formRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomers();
      setRows(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim())                                                              e.name  = "Name is required";
    if (!form.phone.trim())                                                             e.phone = "Phone is required";
    else if (!/^\d{10}$/.test(form.phone.trim()))                                      e.phone = "Must be exactly 10 digits";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))   e.email = "Enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onCreate = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setAdding(true);
    try {
      await createCustomer({ ...form, creditLimit: Number(form.creditLimit || 0) });
      toast.success("Customer added!");
      setForm({ name: "", phone: "", email: "", creditLimit: "" });
      setErrors({});
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add customer");
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

  const inputStyle = (field) => ({
    width: "100%", padding: "9px 12px", borderRadius: 9, fontSize: 13,
    border: `1.5px solid ${errors[field] ? "#fca5a5" : "#e2e8f0"}`,
    background: errors[field] ? "#fff5f5" : "#fff",
    outline: "none", color: "#0f172a", boxSizing: "border-box",
    transition: "border-color 0.15s",
  });

  // Summary stats
  const totalCredit      = rows.reduce((s, r) => s + (r.creditLimit      || 0), 0);
  const totalOutstanding = rows.reduce((s, r) => s + (r.outstandingAmount || 0), 0);

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1050, margin: "0 auto" }}>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: -0.4 }}>
          Customers
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
          Manage customer accounts, credit limits and outstanding balances
        </p>
      </div>

      {/* ── Summary stats ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Customers",   value: rows.length,              fmt: v => v,            accent: "#2563eb" },
          { label: "Total Credit Limit",value: totalCredit,              fmt: currency,           accent: "#7c3aed" },
          { label: "Total Outstanding", value: totalOutstanding,         fmt: currency,           accent: totalOutstanding > 0 ? "#dc2626" : "#0d9488" },
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

      {/* ── Add customer form ─────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0",
        padding: "20px 22px", marginBottom: 24,
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Add New Customer
        </h2>

        <form ref={formRef} onSubmit={onCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14, marginBottom: 14 }}>

            {/* Name */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Customer Name *
              </label>
              <input
                style={{ ...inputStyle("name"), marginTop: 5 }}
                placeholder="e.g. Ramesh Kumar"
                value={form.name}
                onKeyDown={handleEnter}
                onChange={e => { setForm(p => ({ ...p, name: e.target.value })); if (errors.name) setErrors(p => ({ ...p, name: "" })); }}
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
                placeholder="customer@example.com"
                type="email"
                value={form.email}
                onKeyDown={handleEnter}
                onChange={e => { setForm(p => ({ ...p, email: e.target.value })); if (errors.email) setErrors(p => ({ ...p, email: "" })); }}
                onFocus={e => e.target.style.borderColor = errors.email ? "#f87171" : "#2563eb"}
                onBlur={e  => e.target.style.borderColor = errors.email ? "#fca5a5" : "#e2e8f0"}
              />
              {errors.email && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#ef4444" }}>{errors.email}</p>}
            </div>

            {/* Credit limit */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Credit Limit (₹)
              </label>
              <input
                style={{ ...inputStyle("creditLimit"), marginTop: 5 }}
                placeholder="0.00"
                type="number"
                min="0"
                step="0.01"
                value={form.creditLimit}
                onKeyDown={handleEnter}
                onChange={e => setForm(p => ({ ...p, creditLimit: e.target.value }))}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
              />
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>Leave 0 for no credit</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={adding}
            style={{
              padding: "10px 24px", borderRadius: 9, border: "none",
              background: adding ? "#93c5fd" : "#2563eb", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: adding ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { if (!adding) e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => { if (!adding) e.currentTarget.style.background = "#2563eb"; }}
          >
            {adding ? "Adding…" : "+ Add Customer"}
          </button>
        </form>
      </div>

      {/* ── Customers table ───────────────────────────────────────── */}
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
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>All Customers</span>
            <span style={{
              marginLeft: 8, padding: "2px 8px", borderRadius: 20,
              background: "rgba(37,99,235,0.08)", color: "#2563eb",
              fontSize: 11, fontWeight: 600,
            }}>
              {rows.length}
            </span>
          </div>
          <input
            style={{
              padding: "7px 12px", borderRadius: 8, fontSize: 13,
              border: "1.5px solid #e2e8f0", outline: "none",
              color: "#0f172a", width: 220, background: "#f8fafc",
            }}
            placeholder="Search customers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={e => e.target.style.borderColor = "#2563eb"}
            onBlur={e  => e.target.style.borderColor = "#e2e8f0"}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            Loading customers…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
              {search ? "No customers match your search" : "No customers yet"}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              {search ? "Try a different name or phone" : "Add your first customer using the form above"}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["#", "Customer", "Phone", "Email", "Credit Limit", "Outstanding"].map(h => (
                    <th key={h} style={{
                      padding: "10px 18px", textAlign: h === "Credit Limit" || h === "Outstanding" ? "right" : "left",
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
                  <CustomerRow key={row._id || i} row={row} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Row ───────────────────────────────────────────────────────────────────────
const CustomerRow = ({ row, index }) => {
  const [hovered, setHovered] = useState(false);
  const initials = row.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const colors   = ["#2563eb", "#7c3aed", "#0d9488", "#d97706", "#dc2626", "#0891b2"];
  const color    = colors[row.name?.charCodeAt(0) % colors.length] || "#2563eb";
  const outstanding = row.outstandingAmount || 0;

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
      <td style={{ padding: "12px 18px", fontSize: 13 }}>
        {row.email
          ? <a href={`mailto:${row.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>{row.email}</a>
          : <span style={{ color: "#cbd5e1" }}>—</span>
        }
      </td>

      {/* Credit limit */}
      <td style={{ padding: "12px 18px", fontSize: 13, color: "#475569", textAlign: "right", fontWeight: 500 }}>
        {currency(row.creditLimit || 0)}
      </td>

      {/* Outstanding — red if > 0 */}
      <td style={{ padding: "12px 18px", textAlign: "right" }}>
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: outstanding > 0 ? "#dc2626" : "#0d9488",
        }}>
          {currency(outstanding)}
        </span>
        {outstanding > 0 && (
          <span style={{
            marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 10,
            background: "rgba(220,38,38,0.08)", color: "#dc2626", fontWeight: 600,
          }}>
            DUE
          </span>
        )}
      </td>
    </tr>
  );
};

export default CustomersPage;