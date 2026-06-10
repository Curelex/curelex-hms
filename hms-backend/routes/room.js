// hms-backend/routes/roomSettings.js

const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ClinicRoomConfig = require('../models/ClinicRoomConfig');

/**
 * Resolves clinicId from (in priority order):
 *  1. req.body.clinicId   — POST/PUT requests pass it in the body
 *  2. req.query.clinicId  — GET requests pass it as a query param
 *  3. req.user.clinicId   — set by the auth middleware from the JWT
 *  4. 'default'           — safe fallback
 */
function resolveClinicId(req) {
  return (
    req.body?.clinicId  ||
    req.query?.clinicId ||
    req.user?.clinicId  ||
    'default'
  );
}

const hasPerm = (user, permKey) =>
  Array.isArray(user.permissions) && user.permissions.includes(permKey);

// ── GET room config (any authenticated user) ──
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const configs  = await ClinicRoomConfig.find({ clinicId });

    if (configs.length === 0) {
      const defaults = [
        { roomType: 'General Ward', dailyRate: 800,  totalRooms: 5, availableRooms: 5 },
        { roomType: 'Semi-Private', dailyRate: 1500, totalRooms: 4, availableRooms: 4 },
        { roomType: 'Private Room', dailyRate: 2500, totalRooms: 3, availableRooms: 3 },
        { roomType: 'ICU',          dailyRate: 4000, totalRooms: 4, availableRooms: 4 },
      ];
      return res.json(defaults);
    }

    res.json(configs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── BULK UPDATE room config (requires 'room-settings' permission) ──
router.post('/bulk', auth, async (req, res) => {
  try {
    if (!hasPerm(req.user, 'room-settings')) {
      return res.status(403).json({ message: 'Access denied. You need room-settings permission.' });
    }

    const clinicId  = resolveClinicId(req);
    const { configs } = req.body;

    const operations = configs.map(config => ({
      updateOne: {
        filter: { clinicId, roomType: config.roomType },
        update: {
          $set: {
            dailyRate:      config.dailyRate,
            totalRooms:     config.totalRooms,
            availableRooms: config.availableRooms,
          },
        },
        upsert: true,
      },
    }));

    await ClinicRoomConfig.bulkWrite(operations);
    res.json({ message: 'Room settings updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── SINGLE UPDATE (requires 'room-settings' permission) ──
router.put('/:roomType', auth, async (req, res) => {
  try {
    if (!hasPerm(req.user, 'room-settings')) {
      return res.status(403).json({ message: 'Access denied. You need room-settings permission.' });
    }

    const clinicId  = resolveClinicId(req);
    const { roomType }                         = req.params;
    const { dailyRate, totalRooms, availableRooms } = req.body;

    const config = await ClinicRoomConfig.findOneAndUpdate(
      { clinicId, roomType },
      { dailyRate, totalRooms, availableRooms },
      { upsert: true, new: true }
    );

    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;


// ─────────────────────────────────────────────────────────────────────────────
// hms-backend/routes/staff.js  ← separate file (add to server.js too)
// In server.js add: app.use('/api/staff', require('./routes/staff'));
// ─────────────────────────────────────────────────────────────────────────────

// Exported below as a separate module — split into its own file in your project.

const staffRouter  = require('express').Router();
const staffAuth    = require('../middleware/auth');
const roleCheck    = require('../middleware/roleCheck');
const User         = require('../models/User');

function resolveStaffClinicId(req) {
  return (
    req.body?.clinicId  ||
    req.query?.clinicId ||
    req.user?.clinicId  ||
    'default'
  );
}

// GET all staff — admin only, scoped to clinic
staffRouter.get('/', staffAuth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveStaffClinicId(req);
    const staff    = await User.find({ clinicId }, '-password').sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST create staff — admin only
staffRouter.post('/', staffAuth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveStaffClinicId(req);
    const { name, email, password, role, phone, department } = req.body;

    const exists = await User.findOne({ email, clinicId });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    const user   = new User({ clinicId, name, email, password: hashed, role, phone, department });
    await user.save();

    const { password: _, ...userOut } = user.toObject();
    res.status(201).json(userOut);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE staff — admin only, scoped to clinic
staffRouter.delete('/:id', staffAuth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveStaffClinicId(req);
    // Only delete if the user belongs to this clinic
    const deleted  = await User.findOneAndDelete({ _id: req.params.id, clinicId });
    if (!deleted) return res.status(404).json({ message: 'Staff member not found' });
    res.json({ message: 'Staff member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = staffRouter;