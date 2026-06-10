// hms-backend/models/Clinic.js  ← NEW FILE
const mongoose = require('mongoose');

const ClinicSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  email:   { type: String, required: true, unique: true },
  phone:   { type: String },
  address: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Clinic', ClinicSchema);