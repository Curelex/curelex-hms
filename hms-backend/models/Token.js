const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
  clinicId:     { type: String, required: true, index: true, default: 'default' },
  tokenNumber:  { type: Number, required: true },
  date:         { type: String, required: true },   // "YYYY-MM-DD" — resets daily

  // ── Doctor is now OPTIONAL ─────────────────────────────────────────────
  // Patient-requested tokens won't have a doctor assigned yet — staff
  // assigns one later. Receptionist-generated tokens still set this.
  // NOTE: for patient-initiated tokens created via the new flow, doctor
  // IS now set at creation time (patient picks the doctor before paying).
  doctor:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  patient:      { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientName:  { type: String },                   // denormalised for quick display
  generatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // receptionist

  status:       { type: String, enum: ['Waiting', 'Called', 'Done', 'Skipped', 'Pending'], default: 'Waiting' },
  calledAt:     { type: Date },

  // ── fields for patient-initiated appointment requests ─────────────────
  source:       { type: String, enum: ['staff', 'patient'], default: 'staff' },
  age:          { type: Number },
  gender:       { type: String },
  symptoms:     { type: String },

  // ── NEW: consultation type + payment ───────────────────────────────────
  consultationType: { type: String, enum: ['online', 'in-person'], default: 'in-person' },

  consultationFee:  { type: Number, default: 0 }, // snapshot of doctor's fee at booking time

  paymentStatus:    { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentMethod:    { type: String, enum: ['card', 'upi', 'netbanking', null], default: null },
  transactionId:    { type: String }, // mock txn id, generated client/server side
  paidAt:           { type: Date },
}, { timestamps: true });

// Unique token per clinic + doctor + date
// NOTE: doctor can be null/undefined for patient-requested tokens before
// a doctor is assigned — Mongo's unique index treats missing/null doctor
// values as a single shared value across docs, which could collide.
// We work around this by only enforcing this index when doctor is set;
// patient-requested tokens get their tokenNumber from a separate counter
// (see resolveTokenNumber in the route) and so practically won't collide,
// but to be fully safe we make the index partial.
TokenSchema.index(
  { clinicId: 1, doctor: 1, date: 1, tokenNumber: 1 },
  { unique: true, partialFilterExpression: { doctor: { $type: 'objectId' } } }
);

export default mongoose.model('Token', TokenSchema);