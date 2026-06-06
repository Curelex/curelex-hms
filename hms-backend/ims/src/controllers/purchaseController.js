import Purchase from "../models/Purchase.js";
import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { changeStock } from "../services/inventoryService.js";

const listPurchases = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;
  const purchases = await Purchase.find({ clinicId })
    .populate("supplier", "name phone")
    .populate("items.product", "name sku category")
    .sort({ createdAt: -1 });
  res.json({ data: purchases });
});

const createPurchase = asyncHandler(async (req, res) => {
  const { supplierId, items, notes, billType, gstNumber } = req.body;
  const clinicId = req.user.clinicId; // ← already there

  if (!clinicId) { res.status(400); throw new Error("No clinic associated with your account"); }
  if (!items || !items.length) { res.status(400); throw new Error("At least one purchase item is required"); }
  if (billType === "gst" && !gstNumber) { res.status(400); throw new Error("GST number is required for GST bills"); }

  const normalizedItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const product = await Product.findOne({ _id: item.productId, clinicId });
    if (!product) { res.status(404); throw new Error(`Product not found: ${item.productId}`); }

    const lineTotal = Number(item.quantity) * Number(item.unitCost);
    normalizedItems.push({ product: product._id, quantity: Number(item.quantity), unitCost: Number(item.unitCost), lineTotal });
    totalAmount += lineTotal;
  }

  const purchase = await Purchase.create({
    clinicId,
    supplier: supplierId,
    items: normalizedItems,
    totalAmount,
    notes: notes || "",
    status: "received",
    billType: billType || "non-gst",
    gstNumber: billType === "gst" ? (gstNumber || "").toUpperCase().trim() : "",
    createdBy: req.user._id,
  });

  for (const item of normalizedItems) {
    await changeStock({
      clinicId,                        // ✅ THIS WAS MISSING
      productId: item.product,
      quantityChange: Number(item.quantity),
      movementType: "purchase",
      reason: "Purchase received",
      referenceModel: "Purchase",
      referenceId: purchase._id,
      userId: req.user._id,
    });
  }

  res.status(201).json(purchase);
});

const updatePurchaseStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const clinicId = req.user.clinicId;
  const validStatuses = ["pending", "received", "cancelled"];
  if (!validStatuses.includes(status)) { res.status(400); throw new Error("Invalid status"); }

  const purchase = await Purchase.findOneAndUpdate(
    { _id: req.params.id, clinicId },
    { status },
    { new: true }
  ).populate("supplier", "name phone");

  if (!purchase) { res.status(404); throw new Error("Purchase not found"); }
  res.json(purchase);
});

export { listPurchases, createPurchase, updatePurchaseStatus };