import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    clinicId: { type: String, required: true, index: true },  // ← added
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },                                     // ← removed unique:true (now unique per clinic)
    quantity: { type: Number, default: 0, min: 0 },
    damagedOrLost: { type: Number, default: 0, min: 0 },
    expiryDate: { type: Date, default: null },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

inventorySchema.index({ quantity: 1 });
inventorySchema.index({ clinicId: 1 });                        // ← added
inventorySchema.index({ clinicId: 1, product: 1 }, { unique: true }); // ← unique per clinic

const Inventory = mongoose.model("Inventory", inventorySchema);
export default Inventory;