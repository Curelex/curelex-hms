// hms-backend/routes/staff.js  ← NEW FILE (add to server.js too)
// In server.js add: app.use('/api/staff', require('./routes/staff'));

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const User = require('../models/User');

// GET all staff — admin only
router.get('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const staff = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST create staff — admin only
router.post('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { name, email, password, role, phone, department } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed, role, phone, department });
    await user.save();
    const { password: _, ...userOut } = user.toObject();
    res.status(201).json(userOut);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE staff — admin only
router.delete('/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Staff member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;