import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// GET /customers
const listCustomers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const clinicId = req.user.clinicId; // ← ADDED

  const filter = { clinicId }; // ← ADDED
  if (search) filter.name = { $regex: search, $options: "i" };

  const skip = (Number(page) - 1) * Number(limit);
  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Customer.countDocuments(filter),
  ]);

  res.json({ data: customers, meta: { page: Number(page), limit: Number(limit), total } });
});

// POST /customers
const createCustomer = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  if (!clinicId) { res.status(400); throw new Error("No clinic associated with your account"); }
  const customer = await Customer.create({ ...req.body, clinicId }); // ← ADDED
  res.status(201).json(customer);
});

// PUT /customers/:id
const updateCustomer = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, clinicId }, // ← ADDED clinicId
    req.body,
    { new: true, runValidators: true }
  );
  if (!customer) { res.status(404); throw new Error("Customer not found"); }
  res.json(customer);
});

// DELETE /customers/:id
const deleteCustomer = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  const customer = await Customer.findOneAndDelete({ _id: req.params.id, clinicId }); // ← ADDED
  if (!customer) { res.status(404); throw new Error("Customer not found"); }
  res.json({ message: "Customer deleted" });
});

// GET /customers/:id/history
const customerHistory = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  const sales = await Sale.find({ customer: req.params.id, clinicId }) // ← ADDED
    .sort({ createdAt: -1 })
    .populate("customer", "name phone");
  res.json({ data: sales });
});

// POST /customers/:id/clear-dues
const clearDues = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  const customer = await Customer.findOne({ _id: req.params.id, clinicId }); // ← ADDED
  if (!customer) { res.status(404); throw new Error("Customer not found"); }
  customer.outstandingAmount = 0;
  await customer.save();
  res.json({ message: "Dues cleared", customer });
});

export { listCustomers, createCustomer, updateCustomer, deleteCustomer, customerHistory, clearDues };