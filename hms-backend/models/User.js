// hms-backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },   // ✅ NOT globally unique — unique per clinic only
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'], default: 'receptionist' },
  department: { type: String },
  phone: { type: String },
  avatar: {
    type: String,
    default: '',
  },
  isActive: { type: Boolean, default: true },

  // ✅ Every user belongs to a clinic
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
  },

  permissions: {
    type: [String],
    default: ['dashboard'],
  },

  // ✅ NEW: Consultation fee — only relevant for doctors
  // Shown in doctor dropdown during patient registration and auto-fills totalFee
  consultationFee: {
    type: Number,
    default: 0,
  },

}, { timestamps: true });

// ✅ email must be unique WITHIN a clinic, not globally
UserSchema.index({ email: 1, clinicId: 1 }, { unique: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', UserSchema);