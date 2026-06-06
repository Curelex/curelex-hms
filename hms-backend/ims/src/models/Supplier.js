import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    // ── ADDED: clinic isolation ──
    clinicId: { type: String, required: true, index: true },

    name:    { type: String, required: true, trim: true, index: true },
    phone:   { type: String, required: true, trim: true },
    email:   { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, default: "" },
    paymentTrackingEnabled: { type: Boolean, default: false },
    outstandingAmount: { type: Number, default: 0, min: 0 },
    paymentHistory: [
      {
        amount: Number,
        note:   { type: String, default: "" },
        date:   { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Supplier", supplierSchema);