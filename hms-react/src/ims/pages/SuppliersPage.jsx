import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import DataTable from "../components/common/DataTable";
import { createSupplier, fetchSuppliers } from "../services/supplierService";

const SuppliersPage = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  const load = async () => {
    const data = await fetchSuppliers();
    setRows(data.data || []);
  };

  useEffect(() => { load(); }, []);

  // ── Validation ─────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }

    // Phone: exactly 10 digits only
    if (!form.phone.trim()) {
      newErrors.phone = "Phone is required";
    } else if (!/^\d{10}$/.test(form.phone.trim())) {
      newErrors.phone = "Phone must be exactly 10 digits";
    }

    // Email: @ is compulsory (basic email format)
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Enter a valid email (must contain @)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onCreate = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    try {
      await createSupplier(form);
      toast.success("Supplier added!");
      setForm({ name: "", phone: "", email: "" });
      setErrors({});
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add supplier");
    }
  };

  const handleEnter = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const fields = Array.from(
      formRef.current.querySelectorAll("input, textarea, button")
    ).filter((el) => !el.disabled);
    const index = fields.indexOf(e.target);
    if (index < fields.length - 1) {
      fields[index + 1].focus();
    } else {
      onCreate(e);
    }
  };

  // Only allow digits in phone field
  const onPhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10); // digits only, max 10
    setForm((p) => ({ ...p, phone: val }));
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
  };

  const inputClass = (field) =>
    `rounded-lg border px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-300 ${
      errors[field] ? "border-red-400 bg-red-50" : "border-brand-100"
    }`;

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        onSubmit={onCreate}
        className="grid gap-3 rounded-xl border border-brand-100 bg-white p-4 md:grid-cols-3"
      >
        {/* Name */}
        <div className="flex flex-col gap-1">
          <input
            onKeyDown={handleEnter}
            placeholder="Name"
            className={inputClass("name")}
            value={form.name}
            onChange={(e) => {
              setForm((p) => ({ ...p, name: e.target.value }));
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            required
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Phone — digits only, max 10 */}
        <div className="flex flex-col gap-1">
          <input
            onKeyDown={handleEnter}
            placeholder="Phone (10 digits)"
            className={inputClass("phone")}
            value={form.phone}
            onChange={onPhoneChange}
            inputMode="numeric"
            maxLength={10}
            required
          />
          {errors.phone
            ? <p className="text-xs text-red-500">{errors.phone}</p>
            : <p className="text-xs text-slate-400">{form.phone.length}/10 digits</p>
          }
        </div>

        {/* Email — @ required */}
        <div className="flex flex-col gap-1">
          <input
            onKeyDown={handleEnter}
            placeholder="Email (must contain @)"
            className={inputClass("email")}
            value={form.email}
            type="email"
            onChange={(e) => {
              setForm((p) => ({ ...p, email: e.target.value }));
              if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
            }}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white md:col-span-3"
        >
          Add supplier
        </button>
      </form>

      <DataTable
        columns={[
          { key: "name",  label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
        ]}
        rows={rows}
      />
    </div>
  );
};

export default SuppliersPage;