import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema(
  {
    product:   { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity:  { type: Number, required: true, min: 1 },
    unitCost:  { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    // ── ADDED: clinic isolation ──
    clinicId: { type: String, required: true, index: true },

    supplier:    { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    items:       { type: [purchaseItemSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
    notes:       { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "received", "cancelled"],
      default: "received",
    },
    billType: {
      type: String,
      enum: ["gst", "non-gst"],
      default: "non-gst",
    },
    gstNumber: { type: String, default: "", trim: true, uppercase: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

purchaseSchema.index({ createdAt: -1 });
purchaseSchema.index({ clinicId: 1, createdAt: -1 });

export default mongoose.model("Purchase", purchaseSchema);