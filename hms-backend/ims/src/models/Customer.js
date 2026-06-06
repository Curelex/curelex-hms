import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    // ── ADDED: clinic isolation ──
    clinicId: { type: String, required: true, index: true },

    name:  { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, default: "" },
    creditLimit: { type: Number, default: 0, min: 0 },
    outstandingAmount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Customer", customerSchema);