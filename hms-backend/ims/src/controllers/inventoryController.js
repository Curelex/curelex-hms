import Inventory from "../models/Inventory.js";
import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { changeStock } from "../services/inventoryService.js";

// GET /inventory
const listInventory = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;

  const clinicProducts = await Product.find({ clinicId }, "_id").lean();
  const productIds = clinicProducts.map((p) => p._id);

  const docs = await Inventory.find({ product: { $in: productIds } })
    .populate("product", "name sku category lowStockThreshold")
    .sort({ updatedAt: -1 });

  const now = new Date();
  const data = docs.map((entry) => ({
    id: entry._id,
    product: entry.product,
    quantity: entry.quantity,
    expiryDate: entry.expiryDate || null,
    isExpired: entry.expiryDate ? entry.expiryDate < now : false,
    isExpiringSoon: entry.expiryDate
      ? entry.expiryDate > now && entry.expiryDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      : false,
    lowStock: entry.product ? entry.quantity <= entry.product.lowStockThreshold : false,
    outOfStock: entry.quantity === 0,
    updatedAt: entry.updatedAt,
  }));

  res.json({ data });
});

// POST /inventory/adjust
const adjustInventory = asyncHandler(async (req, res) => {
  const { productId, adjustment, reason, expiryDate } = req.body;
  const clinicId = req.user.clinicId; // ← clinic isolation

  const product = await Product.findOne({ _id: productId, clinicId });
  if (!product) { res.status(404); throw new Error("Product not found"); }

  const updated = await changeStock({
    productId,
    clinicId,        // ← FIXED: was missing, caused 500
    quantityChange: Number(adjustment),
    movementType: "adjustment",
    reason: reason || "manual adjustment",
    referenceModel: "Inventory",
    referenceId: productId,
    userId: req.user._id,
  });

  if (expiryDate) {
    await Inventory.findOneAndUpdate(
      { product: productId },
      { expiryDate: new Date(expiryDate) }
    );
  }

  res.json({ message: "Stock adjusted", data: updated });
});

// GET /inventory/low-stock
const lowStock = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;

  const clinicProducts = await Product.find({ clinicId }, "_id").lean();
  const productIds = clinicProducts.map((p) => p._id);

  const docs = await Inventory.aggregate([
    { $match: { product: { $in: productIds } } },
    { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    { $match: { $expr: { $lte: ["$quantity", "$product.lowStockThreshold"] } } },
  ]);

  res.json({ data: docs, count: docs.length });
});

export { listInventory, adjustInventory, lowStock };