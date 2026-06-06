import Counter from "../models/Counter.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";
import { buildInvoiceNumber } from "../utils/invoiceNumber.js";
import { changeStock } from "./inventoryService.js";

// ── Per-clinic invoice counter ────────────────────────────────────
const nextInvoiceNumber = async (clinicId) => {
  const year = new Date().getFullYear();
  const key  = `invoice:${year}:${clinicId}`;
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );
  return buildInvoiceNumber(year, counter.seq);
};

const createSale = async ({
  clinicId,
  customerId,
  walkInName,
  items,
  discountAmount,
  paymentMethod,
  userId,
}) => {
  if (!items || !items.length) throw new Error("At least one sale item is required");
  if (!clinicId) throw new Error("No clinic associated with this session");

  const saleItems = [];
  for (const item of items) {
    const product = await Product.findOne({ _id: item.productId, clinicId });
    if (!product) throw new Error("Product not found");

    const qty        = Number(item.quantity);
    const unitPrice  = Number(product.price);
    const lineAmount = parseFloat((qty * unitPrice).toFixed(2));

    saleItems.push({
      product:    product._id,
      name:       product.name,
      sku:        product.sku,
      quantity:   qty,
      unitPrice:  unitPrice,
      gstRate:    0,
      lineTax:    0,        // ✅ required by model
      lineAmount: lineAmount, // ✅ required by model
      lineTotal:  lineAmount,
      taxAmount:  0,
      finalPrice: lineAmount,
    });
  }

  // ── Totals (no GST) ───────────────────────────────────────────
  const subtotal    = parseFloat(saleItems.reduce((s, i) => s + i.lineAmount, 0).toFixed(2));
  const discount    = parseFloat(Number(discountAmount || 0).toFixed(2));
  const finalAmount = parseFloat((subtotal - discount).toFixed(2));
  const totals = {
    subtotal,
    totalTax:      0,
    totalDiscount: discount,
    finalAmount,
  };

  let customer = null;
  if (customerId) {
    customer = await Customer.findOne({ _id: customerId, clinicId });
    if (!customer) throw new Error("Customer not found");
  }

  if (paymentMethod === "Credit" && customer) {
    const projected = Number(customer.outstandingAmount || 0) + totals.finalAmount;
    if (projected > Number(customer.creditLimit || 0))
      throw new Error("Credit limit exceeded for customer");
  }

  const sale = await Sale.create({
    clinicId,
    invoiceNo:      await nextInvoiceNumber(clinicId),
    customer:       customer ? customer._id : undefined,
    walkInName:     (!customer && walkInName) ? walkInName.trim() : "",
    items:          saleItems,
    subtotal:       totals.subtotal,
    totalTax:       totals.totalTax,
    discountAmount: totals.totalDiscount,
    finalAmount:    totals.finalAmount,
    paymentMethod,
    status:         "draft",
    createdBy:      userId,
  });

  return sale;
};

const finalizeSale = async ({ saleId, userId }) => {
  const sale = await Sale.findById(saleId).populate("customer");
  if (!sale) throw new Error("Sale not found");
  if (sale.status !== "draft") throw new Error("Only draft sales can be finalized");

  for (const item of sale.items) {
    await changeStock({
      clinicId:       sale.clinicId,
      productId:      item.product,
      quantityChange: -Number(item.quantity),
      movementType:   "sale",
      reason:         `Sale ${sale.invoiceNo}`,
      referenceModel: "Sale",
      referenceId:    sale._id,
      userId,
    });
  }

  if (sale.paymentMethod === "Credit" && sale.customer) {
    sale.customer.outstandingAmount =
      Number(sale.customer.outstandingAmount || 0) + Number(sale.finalAmount || 0);
    await sale.customer.save();
  }

  sale.status = "finalized";
  await sale.save();
  return sale;
};

export { createSale, finalizeSale };