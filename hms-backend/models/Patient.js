// hms-backend/models/Patient.js
const mongoose = require('mongoose');

// ── Counter collection for atomic patientId generation ─────────────────────
const CounterSchema = new mongoose.Schema({
  _id:   { type: String, required: true }, // e.g. "patient_PAT00001_default"
  seq:   { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

const PatientSchema = new mongoose.Schema({
  patientId:  { type: String, unique: true, sparse: true },
  clinicId:   { type: String, required: true, index: true, default: 'default' },
  name:       { type: String, required: true },
  age:        { type: Number, required: true },
  gender:     { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  phone:      { type: String, required: true },
  email:      { type: String },
  address:    { type: String },
  bloodGroup: { type: String },
  dob:        { type: Date },
  emergencyContact: { name: String, phone: String, relation: String },
  medicalHistory:   [{ condition: String, since: Date, notes: String }],
  allergies:        [String],
  assignedDoctor:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Active', 'Discharged', 'Critical'], default: 'Active' },
}, { timestamps: true });

// ── Atomic patientId generation — no race conditions ───────────────────────
PatientSchema.pre('save', async function (next) {
  if (this.patientId) return next(); // already assigned, skip

  try {
    // findOneAndUpdate with upsert is atomic — no two saves get the same seq
    const counter = await Counter.findOneAndUpdate(
      { _id: `patient_${this.clinicId}` },   // one counter per clinic
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.patientId = 'PAT' + String(counter.seq).padStart(5, '0');
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Patient', PatientSchema);