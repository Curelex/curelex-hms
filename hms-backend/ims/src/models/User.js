import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { STAFF_PERMISSIONS, ROLES } from '../utils/permissions.js';

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role:     { type: String, enum: Object.values(ROLES), default: ROLES.STAFF },
    permissions: { type: [String], default: STAFF_PERMISSIONS.SALES_BILLING },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,

    // ── ADDED: clinic isolation ──
    clinicId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model('IMSUser', userSchema);