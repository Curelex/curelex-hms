// hms-backend/models/Vendor.js
const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  // ✅ FIX: every vendor belongs to a clinic
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
  },

  vendorId: { type: String },  // ✅ removed global unique — index below scopes it per clinic

  name: { type: String, required: [true, 'Vendor name is required'], trim: true },
  contactPerson: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  gstNumber: { type: String, trim: true },
  category: {
    type: String,
    enum: ['Medical Supplies', 'Equipment', 'Pharmaceuticals', 'General', 'Other'],
    default: 'General',
  },
  paymentTerms: {
    type: String,
    enum: ['Immediate', 'Net 15', 'Net 30', 'Net 45', 'Net 60'],
    default: 'Net 30',
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Blacklisted'],
    default: 'Active',
  },
  rating: { type: Number, min: 1, max: 5, default: 3 },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ✅ vendorId unique within a clinic only
VendorSchema.index({ vendorId: 1, clinicId: 1 }, { unique: true, sparse: true });

// Auto-generate vendorId scoped to clinic
VendorSchema.pre('save', async function (next) {
  if (!this.vendorId) {
    // ✅ count only within this clinic so IDs don't clash across clinics
    const count = await mongoose.model('Vendor').countDocuments({ clinicId: this.clinicId });
    this.vendorId = 'VND' + String(count + 1).padStart(4, '0');
  }
  next();
});

module.exports = mongoose.model('Vendor', VendorSchema);