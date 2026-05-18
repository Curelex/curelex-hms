// hms-backend/models/Token.js
const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
  tokenNumber:  { type: Number, required: true },
  date:         { type: String, required: true },   // "YYYY-MM-DD" — resets daily
  doctor:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patient:      { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientName:  { type: String },                   // denormalised for quick display
  generatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // receptionist
  status:       { type: String, enum: ['Waiting', 'Called', 'Done', 'Skipped'], default: 'Waiting' },
  calledAt:     { type: Date },
}, { timestamps: true });

// Unique token per doctor per date — e.g. Doctor A can only have one Token #3 on a given day
TokenSchema.index({ doctor: 1, date: 1, tokenNumber: 1 }, { unique: true });

module.exports = mongoose.model('Token', TokenSchema);