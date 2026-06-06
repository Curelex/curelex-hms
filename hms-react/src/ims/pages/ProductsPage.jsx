import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import DataTable from "../components/common/DataTable";
import usePermissions from "../hooks/usePermissions";
import {
  createProduct,
  fetchProducts,
  getProductBarcode,
  getProductQr,
} from "../services/productService";
import { fetchInventory } from "../services/inventoryService";
import { currency } from "../utils/format";

const initialForm = {
  name:        "",
  sku:         "",
  mrpPrice:    "",
  costPrice:   "",
  price:       "",
  description: "",
};

const fieldLabels = {
  name:        "Product Name",
  sku:         "SKU / Product Code (e.g. MED-001)",
  mrpPrice:    "MRP Price",
  costPrice:   "Purchase Price",
  price:       "Selling Price",
  description: "Description (optional)",
};

const numberFields = new Set(["mrpPrice", "costPrice", "price"]);

const SORT_OPTIONS = [
  { value: "asc",      label: "Expiry: Earliest first" },
  { value: "desc",     label: "Expiry: Latest first" },
  { value: "none",     label: "No sorting" },
  { value: "noexpiry", label: "No expiry date only" },
];

const ProductsPage = () => {
  const { canWriteProducts } = usePermissions();
  const [products, setProducts]     = useState([]);
  const [form, setForm]             = useState(initialForm);
  const [loading, setLoading]       = useState(false);
  const [qrModal, setQrModal]       = useState(null);
  const [search, setSearch]         = useState("");
  const [expirySort, setExpirySort] = useState("asc");
  const formRef = useRef(null);

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

  // Load products + inventory together, merge expiry onto each product
  const loadProducts = async () => {
    try {
      const [productData, inventoryData] = await Promise.all([
        fetchProducts(),
        fetchInventory(),
      ]);

      const productList   = productData.data   || [];
      const inventoryList = inventoryData.data || [];

      // Map: productId -> inventory record with earliest expiry
      const inventoryMap = {};
      for (const inv of inventoryList) {
        const pid = inv.product?._id || inv.productId;
        if (!pid) continue;
        if (!inventoryMap[pid]) {
          inventoryMap[pid] = inv;
        } else {
          // Keep earliest expiry (most urgent)
          const existing = inventoryMap[pid].expiryDate;
          const current  = inv.expiryDate;
          if (current && (!existing || new Date(current) < new Date(existing))) {
            inventoryMap[pid] = inv;
          }
        }
      }

      // Merge expiryDate + flags onto each product
      const merged = productList.map((p) => {
        const inv = inventoryMap[p._id];
        return {
          ...p,
          expiryDate:     inv?.expiryDate     ?? null,
          isExpired:      inv?.isExpired       ?? false,
          isExpiringSoon: inv?.isExpiringSoon  ?? false,
          inventory:      inv ?? p.inventory,
        };
      });

      setProducts(merged);
    } catch {
      toast.error("Failed to load products");
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const onCreate = async (event) => {
    event.preventDefault();
    if (/^\d+$/.test(form.sku.trim())) {
      toast.error("SKU should be a product code like MED-001, not just a number.");
      return;
    }
    setLoading(true);
    try {
      await createProduct({
        name:        form.name.trim(),
        sku:         form.sku.trim(),
        mrpPrice:    Number(form.mrpPrice),
        costPrice:   Number(form.costPrice),
        price:       Number(form.price),
        description: form.description.trim(),
        category:    "General",
      });
      toast.success("Product created successfully!");
      setForm(initialForm);
      await loadProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  const openQr = async (product) => {
    try {
      const data = await getProductQr(product._id);
      setQrModal({ type: "qr", src: data.qrDataUrl, name: product.name });
    } catch {
      toast.error("Could not load QR code");
    }
  };

  const openBarcode = async (product) => {
    try {
      const src = await getProductBarcode(product._id);
      setQrModal({ type: "barcode", src, name: product.name });
    } catch {
      toast.error("Could not load barcode");
    }
  };

  // Search filter
  const searched = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q)  ||
      String(p.mrpPrice).includes(q)    ||
      String(p.price).includes(q)
    );
  });

  // Expiry sort
  const sorted = [...searched].sort((a, b) => {
    if (expirySort === "none") return 0;
    const ea = a.expiryDate;
    const eb = b.expiryDate;
    if (expirySort === "noexpiry") {
      if (!ea && !eb) return 0;
      if (!ea) return -1;
      if (!eb) return 1;
      return 0;
    }
    if (expirySort === "asc") {
      if (!ea && !eb) return 0;
      if (!ea) return 1;
      if (!eb) return -1;
      return new Date(ea) - new Date(eb);
    }
    if (expirySort === "desc") {
      if (!ea && !eb) return 0;
      if (!ea) return 1;
      if (!eb) return -1;
      return new Date(eb) - new Date(ea);
    }
    return 0;
  });

  const columns = [
    { key: "name",      label: "Name" },
    { key: "sku",       label: "SKU",           render: (row) => row.sku },
    { key: "mrpPrice",  label: "MRP Price",      render: (row) => currency(row.mrpPrice) },
    { key: "costPrice", label: "Purchase Price",  render: (row) => currency(row.costPrice) },
    { key: "price",     label: "Selling Price",   render: (row) => currency(row.price) },
    { key: "quantity",  label: "Quantity",        render: (row) => row.inventory?.quantity ?? 0 },
    {
      key: "expiryDate",
      label: "Expiry Date",
      render: (row) => {
        if (!row.expiryDate)
          return <span className="text-slate-400 text-xs">—</span>;
        const date = new Date(row.expiryDate).toLocaleDateString("en-IN");
        if (row.isExpired)
          return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Expired · {date}</span>;
        if (row.isExpiringSoon)
          return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Expiring soon · {date}</span>;
        return <span className="text-xs text-slate-600">{date}</span>;
      },
    },
    {
      key: "codes",
      label: "Codes",
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => openQr(row)}
            className="rounded bg-teal-600 px-2 py-0.5 text-xs text-white hover:bg-teal-700"
          >
            QR
          </button>
          <button
            onClick={() => openBarcode(row)}
            className="rounded bg-slate-700 px-2 py-0.5 text-xs text-white hover:bg-slate-800"
          >
            Barcode
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">

      {/* QR / Barcode modal */}
      {qrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setQrModal(null)}
        >
          <div
            className="rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 text-center text-sm font-semibold text-slate-800">
              {qrModal.type === "qr" ? "QR Code" : "Barcode"} — {qrModal.name}
            </p>
            <img src={qrModal.src} alt="code" className="mx-auto max-w-[260px]" />
            <button
              onClick={() => setQrModal(null)}
              className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add product form */}
      {canWriteProducts && (
        <form
          ref={formRef}
          onSubmit={onCreate}
          className="grid gap-3 rounded-xl border border-brand-100 bg-white p-4 md:grid-cols-3"
        >
          {Object.keys(initialForm).map((field) => (
            <input
              onKeyDown={handleEnter}
              key={field}
              placeholder={fieldLabels[field]}
              className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
              value={form[field]}
              type={numberFields.has(field) ? "number" : "text"}
              min={numberFields.has(field) ? "0" : undefined}
              step={numberFields.has(field) ? "0.01" : undefined}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [field]: e.target.value }))
              }
              required={field !== "description"}
            />
          ))}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white md:col-span-3 disabled:opacity-60"
          >
            {loading ? "Adding…" : "Add product"}
          </button>
        </form>
      )}

      {/* Search + Sort bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none" stroke="currentColor" strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, SKU, price…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-brand-100 bg-white py-2 pl-9 pr-8 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Sort by expiry:
          </label>
          <select
            value={expirySort}
            onChange={(e) => setExpirySort(e.target.value)}
            className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {search && (
        <p className="text-xs text-slate-400">
          {sorted.length} result{sorted.length !== 1 ? "s" : ""} for "{search}"
        </p>
      )}

      <DataTable columns={columns} rows={sorted} />
    </div>
  );
};

export default ProductsPage;