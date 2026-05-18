// hms-backend/models/BillingRequest.js
const mongoose = require('mongoose');

const BillingRequestSchema = new mongoose.Schema({
  requestId: { type: String, unique: true },

  // ── Source — lab OR pharmacy (one is set, other is null) ─────────────────
  lab:        { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },        // optional
  labId:      { type: String },
  pharmacy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy' },   // optional
  pharmacyId: { type: String },

  // 'Lab' or 'Pharmacy' — so billing dept can distinguish them
  type: { type: String, enum: ['Lab', 'Pharmacy'], default: 'Lab' },

  // Patient
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientId:   { type: String },
  patientName: { type: String },

  // Line items (tests for lab, medicines for pharmacy)
  tests: [{
    testName: String,
    price:    Number,
  }],
  totalAmount: { type: Number, required: true },

  // Who triggered the request (lab tech or pharmacist)
  requestedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requestedByName: { type: String },

  // Workflow
  status: {
    type:    String,
    enum:    ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },

  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:   { type: Date },
  rejectReason: { type: String },

  // Once approved, linked to the billing doc where items were added
  billing: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing' },
}, { timestamps: true });

// Safe requestId generation
BillingRequestSchema.pre('save', async function (next) {
  if (!this.requestId) {
    try {
      const last = await mongoose.model('BillingRequest')
        .findOne({ requestId: { $exists: true, $ne: null } })
        .sort({ requestId: -1 })
        .select('requestId');

      let nextNum = 1;
      if (last?.requestId) {
        const num = parseInt(last.requestId.replace('BREQ', ''), 10);
        if (!isNaN(num)) nextNum = num + 1;
      }
      this.requestId = 'BREQ' + String(nextNum).padStart(5, '0');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('BillingRequest', BillingRequestSchema);