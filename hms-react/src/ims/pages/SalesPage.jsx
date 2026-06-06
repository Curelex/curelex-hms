import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DataTable from "../components/common/DataTable";
import { fetchCustomers } from "../services/customerService";
import { fetchProducts } from "../services/productService";
import {
  createSale,
  fetchSales,
  finalizeSale,
  cancelSale,
  downloadInvoiceUrl
} from "../services/salesService";
import { currency } from "../utils/format";

const EMPTY_ITEM = { productId: "", quantity: "" };

const SalesPage = () => {
  const [sales, setSales]         = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts]   = useState([]);

  const [customerId,    setCustomerId]    = useState("");
  const [walkInName,    setWalkInName]    = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [discountType,  setDiscountType]  = useState("percent");
  const [discountValue, setDiscountValue] = useState("0");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const getProduct = (id) => products.find((p) => p._id === id) || null;

  // ✅ Get available stock for a product
  const getStock = (id) => {
    const p = getProduct(id);
    return p ? (p.inventory?.quantity ?? 0) : 0;
  };

  const addItemRow    = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItemRow = (idx) =>
    setItems((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [field]: value };

        // ✅ If quantity changed, clamp it to available stock
        if (field === "quantity") {
          const stock = getStock(updated.productId);
          const qty   = Number(value);
          if (stock === 0) {
            toast.error(`"${getProduct(updated.productId)?.name}" has 0 stock available.`);
            return { ...it, quantity: "" }; // block entry
          }
          if (qty > stock) {
            toast.error(`Only ${stock} units available for "${getProduct(updated.productId)?.name}"`);
            return { ...it, quantity: String(stock) }; // clamp to max
          }
        }

        // ✅ If product changed, reset quantity
        if (field === "productId") {
          updated.quantity = "";
        }

        return updated;
      })
    );
  };

  const handleDiscountTypeChange = (e) => {
    setDiscountType(e.target.value);
    setDiscountValue("0");
  };

  const handleCustomerChange = (e) => {
    setCustomerId(e.target.value);
    if (e.target.value) setWalkInName("");
  };

  // Live bill calculation
  const lineSubtotals = items.map((it) => {
    const p = getProduct(it.productId);
    return p ? Number(p.price) * (Number(it.quantity) || 0) : 0;
  });
  const subtotal  = lineSubtotals.reduce((a, b) => a + b, 0);
  const discVal   = Math.max(Number(discountValue) || 0, 0);
  let discAmount  = 0;
  if (discountType === "percent") {
    discAmount = parseFloat(((subtotal * Math.min(discVal, 100)) / 100).toFixed(2));
  } else {
    discAmount = parseFloat(Math.min(discVal, subtotal).toFixed(2));
  }
  const billTotal     = parseFloat((subtotal - discAmount).toFixed(2));
  const hasValidItems = items.some((it) => it.productId && Number(it.quantity) >= 1);

  const loadSales = async () => {
    const data = await fetchSales();
    setSales(data.data || []);
  };

  useEffect(() => {
    loadSales();
    fetchCustomers().then((d) => setCustomers(d.data || []));
    fetchProducts().then((d)  => setProducts(d.data  || []));
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    const validItems = items.filter((it) => it.productId && Number(it.quantity) >= 1);
    if (!validItems.length) {
      toast.error("Add at least one item with product and quantity");
      return;
    }

    // ✅ Final stock check before submitting
    for (const it of validItems) {
      const stock = getStock(it.productId);
      const name  = getProduct(it.productId)?.name || "Product";
      if (Number(it.quantity) > stock) {
        toast.error(`Insufficient stock for "${name}". Available: ${stock}`);
        return;
      }
    }

    try {
      await createSale({
        customerId:     customerId || undefined,
        walkInName:     walkInName.trim(),
        items:          validItems.map((it) => ({ productId: it.productId, quantity: Number(it.quantity) })),
        paymentMethod,
        discountAmount: discAmount
      });
      toast.success("Sale draft created");
      setCustomerId(""); setWalkInName("");
      setPaymentMethod("Cash");
      setDiscountType("percent"); setDiscountValue("0");
      setItems([{ ...EMPTY_ITEM }]);
      await loadSales();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create sale");
    }
  };

  const onFinalize = async (saleId) => {
    try {
      await finalizeSale(saleId);
      toast.success("Sale finalized and stock updated");
      await loadSales();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to finalize");
    }
  };

  const onCancel = async (saleId) => {
    if (!window.confirm("Cancel this draft sale?")) return;
    try {
      await cancelSale(saleId);
      toast.success("Sale cancelled");
      await loadSales();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel");
    }
  };

  const resolveCustomerName = (row) =>
    row.customer?.name || row.walkInName || "Walk-in";

  const getSaleSubtotal  = (row) =>
    (row.items || []).reduce((acc, it) => acc + Number(it.unitPrice) * Number(it.quantity), 0);

  const getSaleBillTotal = (row) => {
    const sub  = getSaleSubtotal(row);
    const disc = Number(row.discountAmount || 0);
    return parseFloat((sub - disc).toFixed(2));
  };

  const columns = [
    { key: "invoiceNo", label: "Invoice" },
    { key: "customer",  label: "Customer", render: (row) => resolveCustomerName(row) },
    { key: "paymentMethod", label: "Payment" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          row.status === "finalized" ? "bg-green-100 text-green-700"  :
          row.status === "cancelled" ? "bg-red-100 text-red-600"      :
                                       "bg-yellow-100 text-yellow-700"
        }`}>
          {row.status}
        </span>
      )
    },
    {
      key: "items",
      label: "Items",
      render: (row) => {
        const list = row.items || [];
        if (!list.length) return "—";
        return (
          <div className="space-y-0.5">
            {list.map((it, i) => (
              <div key={i} className="text-xs text-slate-600">{it.name} × {it.quantity}</div>
            ))}
          </div>
        );
      }
    },
    { key: "subtotal", label: "Subtotal", render: (row) => currency(getSaleSubtotal(row)) },
    {
      key: "discountAmount",
      label: "Discount",
      render: (row) => (
        <span className="text-red-500">
          {row.discountAmount > 0 ? `− ${currency(row.discountAmount)}` : "—"}
        </span>
      )
    },
    {
      key: "billTotal",
      label: "Bill Total",
      render: (row) => (
        <span className="font-semibold text-teal-700">{currency(getSaleBillTotal(row))}</span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          {row.status === "draft" && (
            <>
              <button onClick={() => onFinalize(row._id)}
                className="rounded bg-teal-600 px-2 py-1 text-xs font-medium text-white hover:bg-teal-700">
                Finalize
              </button>
              <button onClick={() => onCancel(row._id)}
                className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600">
                Cancel
              </button>
            </>
          )}
          {row.status === "finalized" && (
            <a href={downloadInvoiceUrl(row._id)} target="_blank" rel="noreferrer"
              className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800">
              PDF
            </a>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <form onSubmit={onCreate} className="rounded-xl border border-brand-100 bg-white p-4 space-y-3">

        {/* ── Row 1: Customer + Walk-in name ── */}
        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={customerId}
            onChange={handleCustomerChange}
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
          >
            <option value="">Walk-in customer</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.phone ? `(${c.phone})` : ""}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder={customerId ? "Saved customer selected" : "Customer name (optional)"}
            value={walkInName}
            onChange={(e) => setWalkInName(e.target.value)}
            disabled={!!customerId}
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        {/* ── Row 2: Payment + Discount type + Discount value ── */}
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
          >
            <option>Cash</option>
            <option>UPI</option>
            <option>Card</option>
            <option>Credit</option>
          </select>

          <select
            value={discountType}
            onChange={handleDiscountTypeChange}
            className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
          >
            <option value="percent">Discount %</option>
            <option value="rupees">Discount ₹</option>
          </select>

          <div className="relative">
            <input
              placeholder={discountType === "percent" ? "e.g. 10" : "e.g. 5"}
              type="number"
              min="0"
              max={discountType === "percent" ? "100" : undefined}
              step="0.01"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full rounded-lg border border-brand-100 px-3 py-2 pr-9 text-sm"
            />
            <span className="absolute right-3 top-2.5 text-sm font-semibold text-slate-400 pointer-events-none select-none">
              {discountType === "percent" ? "%" : "₹"}
            </span>
          </div>
        </div>

        {/* ── Items list ── */}
        <div className="rounded-lg border border-brand-100 overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_auto] gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>Product</span>
            <span>Quantity</span>
            <span className="w-8" />
          </div>

          <div className="divide-y divide-brand-50">
            {items.map((it, idx) => {
              const prod    = getProduct(it.productId);
              const qty     = Number(it.quantity) || 0;
              const lineAmt = prod ? Number(prod.price) * qty : 0;
              const stock   = getStock(it.productId); // ✅ available stock
              const noStock = it.productId && stock === 0;
              const lowStock = it.productId && stock > 0 && stock <= 5;

              return (
                <div key={idx} className="grid grid-cols-[2fr_1fr_auto] gap-2 items-start px-3 py-2">
                  <div>
                    <select
                      value={it.productId}
                      onChange={(e) => updateItem(idx, "productId", e.target.value)}
                      className="w-full rounded-lg border border-brand-100 px-2 py-1.5 text-sm"
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} — {currency(p.price)} ({p.sku})
                        </option>
                      ))}
                    </select>

                    {/* ✅ Stock availability badge shown right below product dropdown */}
                    {it.productId && (
                      <p className={`mt-1 text-xs font-medium ${
                        noStock   ? "text-red-500" :
                        lowStock  ? "text-orange-500" :
                                    "text-green-600"
                      }`}>
                        {noStock
                          ? "❌ Out of stock"
                          : lowStock
                            ? `⚠️ Low stock: ${stock} left`
                            : `✅ Available: ${stock}`}
                      </p>
                    )}

                    {prod && qty > 0 && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {currency(prod.price)} × {qty} = <span className="font-medium text-slate-600">{currency(lineAmt)}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <input
                      type="number"
                      min="1"
                      max={stock || undefined}
                      placeholder="Qty"
                      value={it.quantity}
                      disabled={noStock} // ✅ disable qty if no stock
                      onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                      className={`rounded-lg border px-2 py-1.5 text-sm w-full ${
                        noStock
                          ? "border-red-200 bg-red-50 text-red-400 cursor-not-allowed"
                          : "border-brand-100"
                      }`}
                    />
                    {/* ✅ Show max hint */}
                    {it.productId && !noStock && (
                      <p className="mt-1 text-xs text-slate-400">Max: {stock}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    disabled={items.length === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-20 disabled:cursor-not-allowed mt-0.5"
                  >✕</button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-brand-50 px-3 py-2">
            <button type="button" onClick={addItemRow}
              className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700">
              <span className="text-lg leading-none">＋</span> Add another item
            </button>
          </div>
        </div>

        {/* ── Live bill preview ── */}
        {hasValidItems && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 space-y-1 text-sm">
            <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide mb-2">Bill Preview</p>
            {items.map((it, idx) => {
              const prod = getProduct(it.productId);
              const qty  = Number(it.quantity) || 0;
              if (!prod || qty < 1) return null;
              return (
                <div key={idx} className="flex justify-between text-slate-600">
                  <span>{prod.name} × {qty}</span>
                  <span>{currency(Number(prod.price) * qty)}</span>
                </div>
              );
            })}
            <div className="border-t border-slate-200 pt-2 mt-1 space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span><span>{currency(subtotal)}</span>
              </div>
              {discAmount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>
                    Discount {discountType === "percent"
                      ? `(${Math.min(discVal, 100)}%)`
                      : `(₹${discVal})`}
                  </span>
                  <span>− {currency(discAmount)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-slate-300 pt-2 flex justify-between items-center">
              <span className="font-semibold text-slate-700">Bill Total</span>
              <span className="text-xl font-bold text-teal-700">{currency(billTotal)}</span>
            </div>
          </div>
        )}

        <button type="submit"
          className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Create sale
        </button>
      </form>

      <DataTable columns={columns} rows={sales} />
    </div>
  );
};

export default SalesPage;