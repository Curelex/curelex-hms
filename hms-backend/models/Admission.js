// hms-backend/models/Admission.js
const mongoose = require('mongoose');

const MedicineLogSchema = new mongoose.Schema({
  medicineName:  { type: String, required: true },
  dosage:        { type: String },
  quantity:      { type: Number, default: 1 },
  unitPrice:     { type: Number, default: 0 },
  total:         { type: Number, default: 0 },
  givenAt:       { type: Date, default: Date.now },
  givenBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  givenByName:   { type: String },
  notes:         { type: String },
});

const FollowupLogSchema = new mongoose.Schema({
  note:          { type: String, required: true },
  type:          { type: String, enum: ['Doctor', 'Nurse', 'General'], default: 'General' },
  writtenBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  writtenByName: { type: String },
  writtenAt:     { type: Date, default: Date.now },
  vitals: {
    bp:     String,
    temp:   String,
    pulse:  String,
    spo2:   String,
    weight: String,
  },
});

const AdmissionSchema = new mongoose.Schema({
  admissionId:    { type: String, unique: true },
  clinicId:       { type: String, required: true, index: true, default: 'default' },
  patient:        { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admittedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admittedByName: { type: String },

  admissionDate: { type: Date, default: Date.now },
  dischargeDate: { type: Date },
  daysAdmitted:  { type: Number, default: 0 },

  roomType: {
    type: String,
    enum: ['General Ward', 'Semi-Private', 'Private Room', 'ICU'],
    default: 'General Ward',
  },
  roomNumber:     { type: String },
  roomRatePerDay: { type: Number, default: 800 },
  roomRent:       { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['Admitted', 'Discharged', 'Transferred'],
    default: 'Admitted',
  },

  medicineLog: [MedicineLogSchema],
  followupLog: [FollowupLogSchema],

  bill:  { type: mongoose.Schema.Types.ObjectId, ref: 'Billing' },
  notes: { type: String },
}, { timestamps: true });

// ─── Reliable admissionId generation ────────────────────────────────────────
// Uses the highest existing number for this clinic rather than countDocuments,
// so deletions and race conditions don't cause duplicate key errors.
AdmissionSchema.pre('save', async function (next) {
  if (this.admissionId) return next(); // already set, skip

  try {
    const AdmissionModel = mongoose.model('Admission');

    // Find the admission with the highest numeric suffix for this clinic
    const last = await AdmissionModel
      .findOne({ clinicId: this.clinicId, admissionId: /^ADM\d+$/ })
      .sort({ admissionId: -1 })  // lexicographic sort works because IDs are zero-padded
      .select('admissionId')
      .lean();

    let nextNumber = 1;
    if (last?.admissionId) {
      const parsed = parseInt(last.admissionId.slice(3), 10); // strip 'ADM'
      if (!isNaN(parsed)) nextNumber = parsed + 1;
    }

    this.admissionId = 'ADM' + String(nextNumber).padStart(5, '0');
    return next();
  } catch (err) {
    return next(err);
  }
});

module.exports = mongoose.model('Admission', AdmissionSchema);