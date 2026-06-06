import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    // ── ADDED: clinic isolation ──
    clinicId: { type: String, required: true, index: true },

    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    movementType: {
      type: String,
      enum: ["sale", "purchase", "adjustment"],
      required: true,
    },
    quantityChange: { type: Number, required: true },
    reason:         { type: String, default: "" },
    referenceModel: { type: String, default: "" },
    referenceId:    { type: mongoose.Schema.Types.ObjectId },
    performedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ clinicId: 1, createdAt: -1 });

export default mongoose.model("StockMovement", stockMovementSchema);