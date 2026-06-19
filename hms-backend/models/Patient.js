// hms-backend/models/Patient.js
import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  // Reference to User for login
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },

  // Patient identification
  patientId: { type: String, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  
  // Personal details - Allow null
  dob: { type: Date, default: null },
  age: { type: Number, default: null },
  gender: { 
    type: String, 
    enum: ['Male', 'Female', 'Other', null],
    default: null 
  },
  bloodGroup: { 
    type: String, 
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null],
    default: null 
  },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  
  // Emergency contact
  emergencyContact: { type: String, default: '' },
  emergencyName: { type: String, default: '' },
  emergencyRelation: { type: String, default: '' },
  
  // Medical information
  allergies: { type: String, default: '' },
  chronicConditions: { type: String, default: '' },
  currentMedications: { type: String, default: '' },
  medicalHistory: { type: String, default: '' },
  notes: { type: String, default: '' },
  
  // Clinic reference
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true,
  },
  
  // Assigned doctor
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  
  // Status
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Discharged', 'Deceased'],
    default: 'Active',
  },
  
  // Registration
  registrationDate: { type: Date, default: Date.now },
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  
  // Photo
  photo: { type: String, default: '' },
  photoPublicId: { type: String, default: '' },

}, { timestamps: true });

// Auto-generate patientId
PatientSchema.pre('save', async function (next) {
  if (!this.patientId) {
    const Patient = mongoose.model('Patient');
    const count = await Patient.countDocuments({ clinicId: this.clinicId });
    const padded = String(count + 1).padStart(5, '0');
    this.patientId = `PAT${padded}`;
  }
  next();
});

// Indexes
PatientSchema.index({ clinicId: 1, patientId: 1 });
PatientSchema.index({ clinicId: 1, email: 1 });
PatientSchema.index({ clinicId: 1, phone: 1 });

module.exports = mongoose.model('Patient', PatientSchema);
