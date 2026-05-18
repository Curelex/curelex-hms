const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const auth   = require('../middleware/auth');

const ALL_PERMISSIONS = [
  'dashboard','patients','appointments','billing',
  'prescriptions','pharmacy','lab','inventory','staff',
];

// ── Build the user object sent to the client ───────────────────
function userPayload(user) {
  const permissions = user.role === 'admin'
    ? ALL_PERMISSIONS
    : (user.permissions?.length ? user.permissions : ['dashboard']);
  return {
    id:          user._id,
    name:        user.name,
    email:       user.email,
    role:        user.role,
    department:  user.department,
    phone:       user.phone,
    isActive:    user.isActive,
    permissions,
  };
}

// ── Register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department, phone, permissions } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const resolvedPerms = role === 'admin'
      ? ALL_PERMISSIONS
      : (permissions?.length ? permissions : ['dashboard']);

    const user = await User.create({
      name, email, password, role, department, phone,
      permissions: resolvedPerms,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isActive)
      return res.status(403).json({ message: 'Account is inactive. Contact admin.' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    // Return user with permissions so the frontend has them immediately after login
    res.json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get own profile — called on every app boot ─────────────────
// This is the key endpoint: AuthContext calls this with the stored
// token on every page refresh. Returns fresh permissions from DB.
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(userPayload(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get all users (admin) ──────────────────────────────────────
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Update user (admin) ────────────────────────────────────────
router.put('/users/:id', auth, async (req, res) => {
  try {
    const { password, permissions, role, ...rest } = req.body;
    const update = { ...rest };

    if (role) update.role = role;
    update.permissions = role === 'admin'
      ? ALL_PERMISSIONS
      : (permissions ?? undefined);

    if (password) {
      const bcrypt = require('bcryptjs');
      update.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id, update, { new: true }
    ).select('-password');

    res.json(userPayload(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;