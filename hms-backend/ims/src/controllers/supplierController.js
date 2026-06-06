import Supplier from "../models/Supplier.js";
import Purchase from "../models/Purchase.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// GET /suppliers
const listSuppliers = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  const suppliers = await Supplier.find({ clinicId }).sort({ createdAt: -1 }); // ← ADDED
  res.json({ data: suppliers });
});

// POST /suppliers
const createSupplier = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  if (!clinicId) { res.status(400); throw new Error("No clinic associated with your account"); }
  const supplier = await Supplier.create({ ...req.body, clinicId }); // ← ADDED
  res.status(201).json(supplier);
});

// PUT /suppliers/:id
const updateSupplier = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, clinicId }, // ← ADDED
    req.body,
    { new: true, runValidators: true }
  );
  if (!supplier) { res.status(404); throw new Error("Supplier not found"); }
  res.json(supplier);
});

// DELETE /suppliers/:id
const deleteSupplier = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  const supplier = await Supplier.findOneAndDelete({ _id: req.params.id, clinicId }); // ← ADDED
  if (!supplier) { res.status(404); throw new Error("Supplier not found"); }
  res.json({ message: "Supplier deleted" });
});

// GET /suppliers/:id/history
const supplierHistory = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  // Verify supplier belongs to clinic first
  const supplier = await Supplier.findOne({ _id: req.params.id, clinicId }); // ← ADDED
  if (!supplier) { res.status(404); throw new Error("Supplier not found"); }

  const purchases = await Purchase.find({ supplier: req.params.id, clinicId }) // ← ADDED
    .populate("items.product", "name sku")
    .sort({ createdAt: -1 });
  res.json({ data: purchases });
});

// POST /suppliers/:id/record-payment
const recordPayment = asyncHandler(async (req, res) => {
  const { amount, note } = req.body;
  const clinicId = req.user.clinicId; // ← ADDED
  const supplier = await Supplier.findOne({ _id: req.params.id, clinicId }); // ← ADDED
  if (!supplier) { res.status(404); throw new Error("Supplier not found"); }

  supplier.outstandingAmount = Math.max(0, Number(supplier.outstandingAmount || 0) - Number(amount));
  if (!supplier.paymentHistory) supplier.paymentHistory = [];
  supplier.paymentHistory.push({ amount: Number(amount), note: note || "", date: new Date() });
  await supplier.save();
  res.json({ message: "Payment recorded", supplier });
});

export { listSuppliers, createSupplier, updateSupplier, deleteSupplier, supplierHistory, recordPayment };