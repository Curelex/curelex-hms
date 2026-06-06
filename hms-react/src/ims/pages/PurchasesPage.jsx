// import { useEffect, useState } from "react";
// import toast from "react-hot-toast";
// import DataTable from "../components/common/DataTable";
// import { fetchSuppliers } from "../services/supplierService";
// import { fetchProducts } from "../services/productService";
// import { createPurchase, fetchPurchases } from "../services/purchaseService";
// import { currency } from "../utils/format";

// const PurchasesPage = () => {
//   const [rows, setRows] = useState([]);
//   const [suppliers, setSuppliers] = useState([]);
//   const [products, setProducts] = useState([]);
//   const [form, setForm] = useState({ supplierId: "", productId: "", quantity: "", unitCost: "" });

//   const load = async () => {
//     const data = await fetchPurchases();
//     setRows(data.data || []);
//   };

//   useEffect(() => {
//     load();
//     fetchSuppliers().then((d) => setSuppliers(d.data || []));
//     fetchProducts().then((d) => setProducts(d.data || []));
//   }, []);

//   const handleProductChange = (e) => {
//     const selectedId = e.target.value;
//     const selectedProduct = products.find((p) => p._id === selectedId);
//     setForm((prev) => ({
//       ...prev,
//       productId: selectedId,
//       unitCost: selectedProduct ? selectedProduct.costPrice : ""
//     }));
//   };

//   const onCreate = async (event) => {
//     event.preventDefault();
//     try {
//       await createPurchase({
//         supplierId: form.supplierId,
//         items: [
//           {
//             productId: form.productId,
//             quantity: Number(form.quantity),
//             unitCost: Number(form.unitCost)
//           }
//         ]
//       });
//       toast.success("Purchase created & stock updated");
//       setForm({ supplierId: "", productId: "", quantity: "", unitCost: "" });
//       await load();
//     } catch (err) {
//       toast.error(err?.response?.data?.message || "Failed to create purchase");
//     }
//   };

//   const tableRows = rows.flatMap((purchase) =>
//     (purchase.items || []).map((item, idx) => ({
//       _id: `${purchase._id}-${idx}`,
//       supplierName: purchase.supplier?.name || "—",
//       productName: item.product?.name || "—",
//       quantity: item.quantity,
//       unitCost: item.unitCost,
//       lineTotal: item.lineTotal,
//       date: purchase.createdAt
//     }))
//   );

//   const columns = [
//     { key: "supplierName", label: "Supplier" },
//     { key: "productName",  label: "Product Name" },
//     { key: "quantity",     label: "Qty" },
//     { key: "unitCost",     label: "Unit Price", render: (row) => currency(row.unitCost) },
//     { key: "lineTotal",    label: "Line Total",  render: (row) => currency(row.lineTotal) },
//     { key: "date",         label: "Date",        render: (row) => new Date(row.date).toLocaleDateString("en-IN") }
//   ];

//   return (
//     <div className="space-y-4">
//       <form
//         onSubmit={onCreate}
//         className="grid gap-3 rounded-xl border border-brand-100 bg-white p-4 md:grid-cols-2"
//       >
//         <select
//           value={form.supplierId}
//           onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))}
//           className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
//           required
//         >
//           <option value="">Select supplier</option>
//           {suppliers.map((s) => (
//             <option key={s._id} value={s._id}>
//               {s.name}
//             </option>
//           ))}
//         </select>

//         <select
//           value={form.productId}
//           onChange={handleProductChange}
//           className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
//           required
//         >
//           <option value="">Select product</option>
//           {products.map((p) => (
//             <option key={p._id} value={p._id}>
//               {p.name} — {p.category} ({p.sku})
//             </option>
//           ))}
//         </select>

//         <input
//           placeholder="Quantity"
//           type="number"
//           min="1"
//           className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
//           value={form.quantity}
//           onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
//           required
//         />

//         <input
//           placeholder="Unit cost (₹)"
//           type="number"
//           min="0"
//           step="0.01"
//           className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
//           value={form.unitCost}
//           onChange={(e) => setForm((p) => ({ ...p, unitCost: e.target.value }))}
//           required
//         />

//         <button
//           type="submit"
//           className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 md:col-span-2"
//         >
//           Create purchase
//         </button>
//       </form>

//       <DataTable columns={columns} rows={tableRows} />
//     </div>
//   );
// };

// export default PurchasesPage;


import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DataTable from "../components/common/DataTable";
import { fetchSuppliers } from "../services/supplierService";
import { fetchProducts } from "../services/productService";
import { createPurchase, fetchPurchases } from "../services/purchaseService";
import { currency } from "../utils/format";

const PurchasesPage = () => {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    supplierId: "",
    productId: "",
    quantity: "",
    unitCost: "",
    billType: "non-gst",
    gstNumber: ""
  });

  const load = async () => {
    const data = await fetchPurchases();
    setRows(data.data || []);
  };

  useEffect(() => {
    load();
    fetchSuppliers().then((d) => setSuppliers(d.data || []));
    fetchProducts().then((d) => setProducts(d.data || []));
  }, []);

  const handleProductChange = (e) => {
    const selectedId = e.target.value;
    const selectedProduct = products.find((p) => p._id === selectedId);
    setForm((prev) => ({
      ...prev,
      productId: selectedId,
      unitCost: selectedProduct ? selectedProduct.costPrice : ""
    }));
  };

  const handleBillTypeChange = (e) => {
    setForm((prev) => ({
      ...prev,
      billType: e.target.value,
      // clear GST number when switching to non-gst
      gstNumber: e.target.value === "non-gst" ? "" : prev.gstNumber
    }));
  };

  const onCreate = async (event) => {
    event.preventDefault();

    if (form.billType === "gst" && !form.gstNumber.trim()) {
      toast.error("Please enter GST number for GST bill");
      return;
    }

    try {
      await createPurchase({
        supplierId: form.supplierId,
        items: [
          {
            productId: form.productId,
            quantity: Number(form.quantity),
            unitCost: Number(form.unitCost)
          }
        ],
        billType: form.billType,
        gstNumber: form.billType === "gst" ? form.gstNumber.trim().toUpperCase() : ""
      });
      toast.success("Purchase created & stock updated");
      setForm({ supplierId: "", productId: "", quantity: "", unitCost: "", billType: "non-gst", gstNumber: "" });
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create purchase");
    }
  };

  const tableRows = rows.flatMap((purchase) =>
    (purchase.items || []).map((item, idx) => ({
      _id: `${purchase._id}-${idx}`,
      supplierName: purchase.supplier?.name || "—",
      productName: item.product?.name || "—",
      quantity: item.quantity,
      unitCost: item.unitCost,
      lineTotal: item.lineTotal,
      billType: purchase.billType || "non-gst",
      gstNumber: purchase.gstNumber || "",
      date: purchase.createdAt
    }))
  );

  const columns = [
    { key: "supplierName", label: "Supplier" },
    { key: "productName",  label: "Product Name" },
    { key: "quantity",     label: "Qty" },
    { key: "unitCost",     label: "Unit Price",  render: (row) => currency(row.unitCost) },
    { key: "lineTotal",    label: "Line Total",  render: (row) => currency(row.lineTotal) },
    {
      key: "gstNumber",
      label: "GST Number",
      render: (row) =>
        row.billType === "gst" && row.gstNumber ? (
          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
            {row.gstNumber}
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            Non-GST bill
          </span>
        )
    },
    {
      key: "date",
      label: "Date",
      render: (row) => new Date(row.date).toLocaleDateString("en-IN")
    }
  ];

  return (
    <div className="space-y-4">
      <form
        onSubmit={onCreate}
        className="rounded-xl border border-brand-100 bg-white p-4 space-y-3"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {/* Supplier */}
          <select
            value={form.supplierId}
            onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))}
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
            required
          >
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>

          {/* Product */}
          <select
            value={form.productId}
            onChange={handleProductChange}
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
            required
          >
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} — {p.category} ({p.sku})
              </option>
            ))}
          </select>

          {/* Quantity */}
          <input
            placeholder="Quantity"
            type="number"
            min="1"
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
            value={form.quantity}
            onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
            required
          />

          {/* Unit cost */}
          <input
            placeholder="Unit cost (₹)"
            type="number"
            min="0"
            step="0.01"
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
            value={form.unitCost}
            onChange={(e) => setForm((p) => ({ ...p, unitCost: e.target.value }))}
            required
          />

          {/* Bill type */}
          <select
            value={form.billType}
            onChange={handleBillTypeChange}
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
          >
            <option value="non-gst">Non-GST Bill</option>
            <option value="gst">GST Bill</option>
          </select>

          {/* GST number — shown only when GST bill is selected */}
          {form.billType === "gst" ? (
            <input
              placeholder="GST number (e.g. 29ABCDE1234F1Z5)"
              className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-sm uppercase tracking-wider"
              value={form.gstNumber}
              onChange={(e) => setForm((p) => ({ ...p, gstNumber: e.target.value }))}
              maxLength={15}
              required
            />
          ) : (
            <div className="flex items-center rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-400 italic">
              No GST number needed
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Create purchase
        </button>
      </form>

      <DataTable columns={columns} rows={tableRows} />
    </div>
  );
};

export default PurchasesPage;