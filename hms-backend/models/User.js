const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  role:       { type: String, enum: ['admin','doctor','nurse','receptionist','pharmacist','lab_technician'], default: 'receptionist' },
  department: { type: String },
  phone:      { type: String },
  isActive:   { type: Boolean, default: true },

  // ── Granular module permissions ──────────────────────────────
  // Possible values: 'dashboard','patients','appointments','billing',
  //                  'prescriptions','pharmacy','lab','inventory','staff'
  // Admin always gets everything (enforced in auth routes).
  // For all other roles, only these listed modules show in sidebar + dashboard.
  permissions: {
    type: [String],
    default: ['dashboard'],
  },
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', UserSchema);