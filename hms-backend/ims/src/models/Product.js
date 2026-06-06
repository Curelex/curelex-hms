import mongoose from 'mongoose';
import env from '../config/env.js';

const productSchema = new mongoose.Schema(
  {
    // ── Clinic isolation ──────────────────────────────────────────
    clinicId: { type: String, required: true, index: true },

    // ── Core fields ───────────────────────────────────────────────
    name:      { type: String, required: true, trim: true, index: true },
    category:  { type: String, required: true, trim: true, index: true },

    // ── Pricing ───────────────────────────────────────────────────
    mrpPrice:  { type: Number, required: true, min: 0 },   // ✅ NEW: MRP Price
    costPrice: { type: Number, required: true, min: 0 },   // Purchase Price
    price:     { type: Number, required: true, min: 0 },   // Selling Price

    // ── SKU: product code string e.g. "MED-001" ───────────────────
    sku: { type: String, required: true, trim: true, uppercase: true, index: true },

    // ── Other ─────────────────────────────────────────────────────
    description:       { type: String,  default: '' },
    imageUrl:          { type: String,  default: '' },
    gstRate:           { type: Number,  default: env.defaultGstRate, min: 0, max: 100 },
    lowStockThreshold: { type: Number,  default: 5, min: 0 },
    isActive:          { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── SKU unique per clinic (not globally) ─────────────────────────
productSchema.index({ sku: 1, clinicId: 1 }, { unique: true });
productSchema.index({ name: 'text', sku: 'text', category: 'text' });

export default mongoose.model('Product', productSchema);