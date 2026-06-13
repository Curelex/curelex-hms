// hms-backend/routes/auth.js
const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const mongoose = require('mongoose');
const User     = require('../models/User');
const Clinic   = require('../models/Clinic');
const auth     = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Define SsoToken model locally in HMS to write to the shared IMS database
const ssoTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true },
  email:     { type: String, required: true },
  clinicId:  { type: String, required: true },
  expiresAt: { type: Date,   required: true },
}, { timestamps: false });

const SsoToken = mongoose.models.SsoToken || mongoose.model('SsoToken', ssoTokenSchema);

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Creates a NEW clinic + the first admin user for that clinic
// ─────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, clinicName, phone } = req.body;

    if (!clinicName) {
      return res.status(400).json({ message: 'Clinic name is required' });
    }

    // ✅ Check if clinic email already used
    const existingClinic = await Clinic.findOne({ email });
    if (existingClinic) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // ✅ Create the clinic first
    const clinic = await Clinic.create({ name: clinicName, email, phone });

    // ✅ Create admin user tied to this clinic
    const user = await User.create({
      name,
      email,
      password,
      role: 'admin',
      clinicId: clinic._id,           // ← key fix
      permissions: [
        'dashboard','patients','ipd','billing',
        'prescriptions','pharmacy','lab','inventory',
        'room-settings','staff',
      ],
    });

    const token = jwt.sign(
      { id: user._id, role: user.role, clinicId: clinic._id },  // ← clinicId in token
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = user.toObject();
    res.status(201).json({ token, user: userOut });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Find user by email (could be multiple clinics, match password)
    const users = await User.find({ email });
    if (!users.length) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Match password across found users
    let matchedUser = null;
    for (const u of users) {
      const ok = await u.matchPassword(password);
      if (ok) { matchedUser = u; break; }
    }

    if (!matchedUser) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!matchedUser.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated' });
    }

    const token = jwt.sign(
      { id: matchedUser._id, role: matchedUser.role, clinicId: matchedUser.clinicId }, // ← clinicId in token
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = matchedUser.toObject();
    
    res.json({ token, user: userOut });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/profile  — returns current logged-in user
// ─────────────────────────────────────────────────────────────────
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/auth/users  — list ALL staff for this clinic only
// ─────────────────────────────────────────────────────────────────
router.get('/users', auth, async (req, res) => {
  try {
    // ✅ FIX: filter by clinicId from the JWT — never shows other clinics' data
    const staff = await User.find(
      { clinicId: req.user.clinicId },
      '-password'
    ).sort({ createdAt: -1 });

    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/users  — add staff to THIS clinic (admin only)
// ─────────────────────────────────────────────────────────────────
router.post('/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { name, email, password, role, department, phone, permissions } = req.body;

    if (!password) return res.status(400).json({ message: 'Password is required' });

    // ✅ Check email uniqueness WITHIN this clinic only
    const exists = await User.findOne({ email, clinicId: req.user.clinicId });
    if (exists) return res.status(400).json({ message: 'Email already registered in this clinic' });

    const user = await User.create({
      name, email, password, role,
      department, phone, permissions,
      clinicId: req.user.clinicId,   // ← always attach clinic
    });

    const { password: _, ...userOut } = user.toObject();
    res.status(201).json(userOut);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/auth/users/:id  — update staff (admin only)
// ─────────────────────────────────────────────────────────────────
router.put('/users/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { password, ...fields } = req.body;

    // ✅ Only allow editing users within this clinic
    const user = await User.findOne({ _id: req.params.id, clinicId: req.user.clinicId });
    if (!user) return res.status(404).json({ message: 'Staff member not found' });

    // Check email conflict within clinic if email is being changed
    if (fields.email && fields.email !== user.email) {
      const conflict = await User.findOne({ email: fields.email, clinicId: req.user.clinicId });
      if (conflict) return res.status(400).json({ message: 'Email already in use in this clinic' });
    }

    Object.assign(user, fields);
    if (password) user.password = password; // pre-save hook will hash it

    await user.save();
    const { password: _, ...userOut } = user.toObject();
    res.json(userOut);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/auth/users/:id  — remove staff (admin only)
// ─────────────────────────────────────────────────────────────────
router.delete('/users/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    // ✅ Only delete within this clinic
    const user = await User.findOneAndDelete({ _id: req.params.id, clinicId: req.user.clinicId });
    if (!user) return res.status(404).json({ message: 'Staff member not found' });
    res.json({ message: 'Staff member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Generate SSO Token for IMS ─────────────────────────────────
router.post('/sso-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is inactive' });

    // Generate a secure one-time token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 1 minute from now
    const expiresAt = new Date(Date.now() + 60 * 1000);
    
    // Save to the shared database
    await SsoToken.create({
      token,
      email: user.email,
      clinicId: 'HMS_DEFAULT_CLINIC', // Default since HMS User model doesn't store clinicId
      expiresAt,
    });
    
    res.status(201).json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;