// hms-backend/models/BillingRequest.js
const mongoose = require('mongoose');

const BillingRequestSchema = new mongoose.Schema({
  requestId: { type: String, unique: true },
  clinicId:  { type: String, required: true, index: true, default: 'default' }, // ← NEW

  // Source — lab OR pharmacy
  lab:        { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  labId:      { type: String },
  pharmacy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy' },
  pharmacyId: { type: String },

  type: { type: String, enum: ['Lab', 'Pharmacy'], default: 'Lab' },

  // Patient
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  patientId:   { type: String },
  patientName: { type: String },

  // Line items
  tests: [{
    testName: String,
    price:    Number,
  }],
  totalAmount: { type: Number, required: true },

  requestedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requestedByName: { type: String },

  status: {
    type:    String,
    enum:    ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },

  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt:   { type: Date },
  rejectReason: { type: String },

  billing: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing' },
}, { timestamps: true });

// Safe requestId generation — scoped per clinic
BillingRequestSchema.pre('save', async function (next) {
  if (!this.requestId) {
    try {
      const last = await mongoose.model('BillingRequest')
        .findOne({ clinicId: this.clinicId, requestId: { $exists: true, $ne: null } })
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