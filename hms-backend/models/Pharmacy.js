// hms-backend/models/Pharmacy.js
const mongoose = require('mongoose');

const PharmacySchema = new mongoose.Schema({
  prescriptionId: { type: String, unique: true },
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  medicines: [{
    name:         { type: String, required: true },
    dosage:       String,
    quantity:     { type: Number, required: true },
    unitPrice:    Number,
    total:        Number,
    instructions: String,
  }],
  totalAmount:  { type: Number, default: 0 },
  status:       { type: String, enum: ['Pending', 'Dispensed', 'Cancelled'], default: 'Pending' },
  dispensedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispensedAt:  { type: Date },
  notes:        String,

  // Saved at creation — true if patient was admitted when prescription was created
  // Persists so table always shows correct OPD/IPD badge even after page reload
  isIPD: { type: Boolean, default: false },
}, { timestamps: true });

// Safe prescriptionId — uses highest existing instead of countDocuments
// Prevents duplicate key errors from deletions or concurrent saves
PharmacySchema.pre('save', async function (next) {
  if (!this.prescriptionId) {
    try {
      const last = await mongoose.model('Pharmacy')
        .findOne({ prescriptionId: { $exists: true, $ne: null } })
        .sort({ prescriptionId: -1 })
        .select('prescriptionId');

      let nextNum = 1;
      if (last?.prescriptionId) {
        const num = parseInt(last.prescriptionId.replace('RX', ''), 10);
        if (!isNaN(num)) nextNum = num + 1;
      }
      this.prescriptionId = 'RX' + String(nextNum).padStart(5, '0');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Pharmacy', PharmacySchema);