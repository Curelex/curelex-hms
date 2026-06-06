import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    product:    { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name:       { type: String, required: true },
    sku:        { type: String, required: true },
    quantity:   { type: Number, required: true, min: 1 },
    unitPrice:  { type: Number, required: true, min: 0 },
    gstRate:    { type: Number, required: true, min: 0 },
    lineAmount: { type: Number, required: true, min: 0 },
    lineTax:    { type: Number, required: true, min: 0 },
    lineTotal:  { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    clinicId: { type: String, required: true, index: true },

    invoiceNo:      { type: String, required: true }, // ← FIXED: removed unique:true
    customer:       { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    walkInName:     { type: String, default: "" },
    items:          { type: [saleItemSchema], default: [] },
    subtotal:       { type: Number, required: true, min: 0 },
    totalTax:       { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    finalAmount:    { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Credit"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "finalized", "cancelled"],
      default: "draft",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ clinicId: 1, createdAt: -1 });

// ← FIXED: invoiceNo unique per clinic, not globally
saleSchema.index({ clinicId: 1, invoiceNo: 1 }, { unique: true });

export default mongoose.model("Sale", saleSchema);