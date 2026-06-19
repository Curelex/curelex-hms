import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
// hms-backend/routes/roomSettings.js

import express from 'express';
const router  = express.Router();
const {auth}    = require('../middleware/auth');
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
    console.log("BODY:", req.body);

    // if (!hasPerm(req.user, 'room-settings')) {
    //   return res.status(403).json({
    //     message: 'Access denied. You need room-settings permission.'
    //   });
    // }

    const clinicId = resolveClinicId(req);
    const { configs } = req.body;

    console.log("CLINIC ID:", clinicId);
    console.log("CONFIGS:", configs);

    const operations = configs.map(config => ({
      updateOne: {
        filter: { clinicId, roomType: config.roomType },
        update: {
          $set: {
            dailyRate: config.dailyRate,
            totalRooms: config.totalRooms,
            availableRooms: config.availableRooms,
          },
        },
        upsert: true,
      },
    }));

    console.log("OPERATIONS:", operations);

    await ClinicRoomConfig.bulkWrite(operations);

    console.log("✅ BULK WRITE SUCCESS");

    res.json({ message: 'Room settings updated successfully' });

  } catch (err) {
    console.error("❌ ROOM SAVE ERROR:", err);
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


export default router;
