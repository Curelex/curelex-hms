// hms-backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  email:      { type: String, required: true },   // ✅ NOT globally unique — unique per clinic only
  password:   { type: String, required: true },
  role:       { type: String, enum: ['admin','doctor','nurse','receptionist','pharmacist','lab_technician'], default: 'receptionist' },
  department: { type: String },
  phone:      { type: String },
  isActive:   { type: Boolean, default: true },

  // ✅ FIX: Every user belongs to a clinic
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
  },

  permissions: {
    type: [String],
    default: ['dashboard'],
  },
}, { timestamps: true });

// ✅ FIX: email must be unique WITHIN a clinic, not globally
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