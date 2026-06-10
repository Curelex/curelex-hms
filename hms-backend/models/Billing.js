// hms-backend/models/Billing.js
const mongoose = require('mongoose');

const BillingSchema = new mongoose.Schema({
  billId:   { type: String, unique: true },
  clinicId: { type: String, required: true, index: true, default: 'default' }, // ← NEW
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

  items: [{
    description: String,
    category:    { type: String, enum: ['Medicine', 'Lab', 'Procedure', 'Consultation', 'Other'], default: 'Other' },
    addedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedByName: String,
    quantity:    { type: Number, default: 1 },
    unitPrice:   { type: Number, default: 0 },
    total:       { type: Number, default: 0 },
    sourceRef:   String,
  }],

  admissionDate:  { type: Date },
  dischargeDate:  { type: Date },
  daysAdmitted:   { type: Number, default: 0 },
  roomType: {
    type: String,
    enum: ['General Ward', 'Semi-Private', 'Private Room', 'ICU'],
    default: 'General Ward',
  },
  roomRatePerDay: { type: Number, default: 800 },
  roomRent:       { type: Number, default: 0 },

  subtotal:    { type: Number, default: 0 },
  discount:    { type: Number, default: 0 },
  tax:         { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount:  { type: Number, default: 0 },

  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Insurance', 'UPI', 'Pending'],
    default: 'Pending',
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Partial', 'Pending', 'Cancelled'],
    default: 'Pending',
  },

  insuranceDetails: {
    provider:     String,
    policyNumber: String,
    claimAmount:  Number,
  },

  notes:       { type: String },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

BillingSchema.pre('save', async function (next) {
  if (!this.billId) {
    const count  = await mongoose.model('Billing').countDocuments({ clinicId: this.clinicId });
    this.billId  = 'BILL' + String(count + 1).padStart(5, '0');
  }
  next();
});

module.exports = mongoose.model('Billing', BillingSchema);