// models/PatientRecord.js
const mongoose = require('mongoose');

const patientRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  patientCode: { type: String }, // e.g. PAT00002
  tokenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token'
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic'
  },

  // Uploaded files (reports, prescriptions, etc.)
  files: [
    {
      filename: String,         // original file name
      storedName: String,       // name on disk / cloud
      path: String,             // URL or local path
      mimetype: String,
      size: Number,
      label: String,            // e.g. "Blood Report", "X-Ray"
      uploadedAt: { type: Date, default: Date.now }
    }
  ],

  // Follow-up appointments
  followUps: [
    {
      date: { type: Date, required: true },
      note: { type: String },
      createdAt: { type: Date, default: Date.now },
      status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled'],
        default: 'scheduled'
      }
    }
  ],

  // Doctor notes / visit notes
  notes: { type: String },

  visitDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for fast patient lookup
patientRecordSchema.index({ patientId: 1, visitDate: -1 });
patientRecordSchema.index({ patientCode: 1 });

module.exports = mongoose.model('PatientRecord', patientRecordSchema);