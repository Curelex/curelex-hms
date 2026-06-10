// hms-backend/models/Patient.js
const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  patientId:  { type: String, unique: true, sparse: true },
  clinicId:   { type: String, required: true, index: true, default: 'default' }, // ← NEW
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

// ── Safe patientId generation — scoped per clinic ──────────────────────────
PatientSchema.pre('save', async function (next) {
  if (!this.patientId) {
    try {
      // Find the highest patientId within this clinic only
      const last = await mongoose.model('Patient')
        .findOne({ clinicId: this.clinicId, patientId: { $exists: true, $ne: null } })
        .sort({ patientId: -1 })
        .select('patientId');

      let nextNum = 1;
      if (last?.patientId) {
        const num = parseInt(last.patientId.replace('PAT', ''), 10);
        if (!isNaN(num)) nextNum = num + 1;
      }
      this.patientId = 'PAT' + String(nextNum).padStart(5, '0');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Patient', PatientSchema);