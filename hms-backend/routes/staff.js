import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
// hms-backend/routes/staff.js
// In server.js add: app.use('/api/staff', require('./routes/staff'));

import express   from 'express';
const router    = express.Router();
const {auth}      = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const User      = require('../models/User');

/**
 * Resolves clinicId from (in priority order):
 *  1. req.body.clinicId   — POST/DELETE requests pass it in the body
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

// ── GET all staff — admin only, scoped to clinic ──────────────────────────────
router.get('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const staff    = await User.find({ clinicId }, '-password').sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST create staff — admin only ────────────────────────────────────────────
router.post('/', auth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { name, email, password, role, phone, department } = req.body;

    // Scope duplicate check to this clinic — two clinics may share an email
    const exists = await User.findOne({ email, clinicId });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user   = new User({ clinicId, name, email, password: hashed, role, phone, department });
    await user.save();

    const { password: _, ...userOut } = user.toObject();
    res.status(201).json(userOut);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE staff — admin only, scoped to clinic ───────────────────────────────
router.delete('/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    // findOneAndDelete with clinicId guard prevents Clinic A admin
    // from accidentally deleting a user that belongs to Clinic B
    const deleted  = await User.findOneAndDelete({ _id: req.params.id, clinicId });
    if (!deleted) return res.status(404).json({ message: 'Staff member not found' });
    res.json({ message: 'Staff member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

// ─────────────────────────────────────────────────────────────────────────────
// hms-backend/routes/staff.js  ← separate file (add to server.js too)
// In server.js add: app.use('/api/staff', require('./routes/staff'));
// ─────────────────────────────────────────────────────────────────────────────

// Exported below as a separate module — split into its own file in your project.

// import staffRouter  from 'express').Router(;
// import staffAuth    from '../middleware/auth.js';
// import roleCheck    from '../middleware/roleCheck.js';
// import User         from '../models/User.js';

// function resolveStaffClinicId(req) {
//   return (
//     req.body?.clinicId  ||
//     req.query?.clinicId ||
//     req.user?.clinicId  ||
//     'default'
//   );
// }

// // GET all staff — admin only, scoped to clinic
// staffRouter.get('/', staffAuth, roleCheck('admin'), async (req, res) => {
//   try {
//     const clinicId = resolveStaffClinicId(req);
//     const staff    = await User.find({ clinicId }, '-password').sort({ createdAt: -1 });
//     res.json(staff);
//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // POST create staff — admin only
// staffRouter.post('/', staffAuth, roleCheck('admin'), async (req, res) => {
//   try {
//     const clinicId = resolveStaffClinicId(req);
//     const { name, email, password, role, phone, department } = req.body;

//     const exists = await User.findOne({ email, clinicId });
//     if (exists) return res.status(400).json({ message: 'Email already registered' });

//     const hashed = await bcrypt.hash(password, 10);
//     const user   = new User({ clinicId, name, email, password: hashed, role, phone, department });
//     await user.save();

//     const { password: _, ...userOut } = user.toObject();
//     res.status(201).json(userOut);
//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // DELETE staff — admin only, scoped to clinic
// staffRouter.delete('/:id', staffAuth, roleCheck('admin'), async (req, res) => {
//   try {
//     const clinicId = resolveStaffClinicId(req);
//     // Only delete if the user belongs to this clinic
//     const deleted  = await User.findOneAndDelete({ _id: req.params.id, clinicId });
//     if (!deleted) return res.status(404).json({ message: 'Staff member not found' });
//     res.json({ message: 'Staff member removed' });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// export default staffRouter;