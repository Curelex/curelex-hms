// hms-backend/models/Admission.js
const mongoose = require('mongoose');

// Each entry in medicineLog = one medicine given to patient on a specific date
const MedicineLogSchema = new mongoose.Schema({
  medicineName:  { type: String, required: true },
  dosage:        { type: String },               // e.g. "500mg"
  quantity:      { type: Number, default: 1 },
  unitPrice:     { type: Number, default: 0 },
  total:         { type: Number, default: 0 },
  givenAt:       { type: Date, default: Date.now },
  givenBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // receptionist
  givenByName:   { type: String },               // denormalised
  notes:         { type: String },
});

// Each entry in followupLog = a visit note from doctor or nurse
const FollowupLogSchema = new mongoose.Schema({
  note:          { type: String, required: true },
  type:          { type: String, enum: ['Doctor', 'Nurse', 'General'], default: 'General' },
  writtenBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  writtenByName: { type: String },
  writtenAt:     { type: Date, default: Date.now },
  // optional vitals (nurse can fill these)
  vitals: {
    bp:        String,   // e.g. "120/80"
    temp:      String,   // e.g. "98.6°F"
    pulse:     String,   // e.g. "72 bpm"
    spo2:      String,   // e.g. "98%"
    weight:    String,
  },
});

const AdmissionSchema = new mongoose.Schema({
  admissionId:   { type: String, unique: true },

  patient:       { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // treating doctor
  admittedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // receptionist who admitted
  admittedByName:{ type: String },

  admissionDate: { type: Date, default: Date.now },
  dischargeDate: { type: Date },
  daysAdmitted:  { type: Number, default: 0 },   // computed on discharge / bill

  // Room details
  roomType: {
    type: String,
    enum: ['General Ward', 'Semi-Private', 'Private Room', 'ICU'],
    default: 'General Ward',
  },
  roomNumber:    { type: String },
  roomRatePerDay:{ type: Number, default: 800 },
  roomRent:      { type: Number, default: 0 },    // auto-computed

  // Status
  status: {
    type: String,
    enum: ['Admitted', 'Discharged', 'Transferred'],
    default: 'Admitted',
  },

  // Medicine log — receptionist adds medicines given to patient
  medicineLog:  [MedicineLogSchema],

  // Follow-up log — doctor/nurse notes
  followupLog:  [FollowupLogSchema],

  // Linked bill (set when bill is generated)
  bill:         { type: mongoose.Schema.Types.ObjectId, ref: 'Billing' },

  notes:        { type: String },
}, { timestamps: true });

// Auto-generate admissionId
AdmissionSchema.pre('save', async function (next) {
  if (!this.admissionId) {
    const count = await mongoose.model('Admission').countDocuments();
    this.admissionId = 'ADM' + String(count + 1).padStart(5, '0');
  }
  next();
});

module.exports = mongoose.model('Admission', AdmissionSchema);