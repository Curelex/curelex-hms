// hms-backend/routes/tokens.js
// Add to server.js:  app.use('/api/tokens', require('./routes/tokens'));

const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const Token   = require('../models/Token');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD" in local time (IST-safe). */
function todayStr() {
  const d   = new Date();
  const yr  = d.getFullYear();
  const mo  = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${day}`;
}

/**
 * Resolves clinicId from (in priority order):
 *  1. req.body.clinicId   — POST/PUT requests pass it in the body
 *  2. req.query.clinicId  — GET/DELETE requests pass it as a query param
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

// ── POST /api/tokens/generate ────────────────────────────────────────────────
// Body: { clinicId, doctorId, patientId?, patientName? }
router.post('/generate', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { doctorId, patientId, patientName } = req.body;
    if (!doctorId) return res.status(400).json({ message: 'doctorId is required' });

    const date = todayStr();

    // Find highest token number for this doctor today — scoped to clinic
    const last = await Token.findOne({ clinicId, doctor: doctorId, date })
      .sort({ tokenNumber: -1 })
      .select('tokenNumber');

    const tokenNumber = last ? last.tokenNumber + 1 : 1;

    const token = await Token.create({
      clinicId,
      tokenNumber,
      date,
      doctor:      doctorId,
      patient:     patientId   || undefined,
      patientName: patientName || 'Walk-in',
      generatedBy: req.user.id,
    });

    await token.populate([
      { path: 'doctor',      select: 'name department' },
      { path: 'generatedBy', select: 'name role' },
      { path: 'patient',     select: 'name patientId' },
    ]);

    res.status(201).json(token);
  } catch (err) {
    console.error('Token generate error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/tokens/today ────────────────────────────────────────────────────
// Returns all tokens for today, optionally filtered by doctorId.
// Query: ?clinicId=xxx&doctorId=xxx
router.get('/today', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { doctorId } = req.query;
    const date  = todayStr();
    const query = { clinicId, date };
    if (doctorId) query.doctor = doctorId;

    const tokens = await Token.find(query)
      .populate('doctor',      'name department')
      .populate('patient',     'name patientId')
      .populate('generatedBy', 'name role')
      .sort({ tokenNumber: 1 });

    res.json({ date, tokens });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/tokens/summary ──────────────────────────────────────────────────
// Returns per-doctor token counts for today — used in dashboard widgets.
// Query: ?clinicId=xxx
router.get('/summary', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const date     = todayStr();

    const summary = await Token.aggregate([
      { $match: { clinicId, date } },
      {
        $group: {
          _id:       '$doctor',
          total:     { $sum: 1 },
          waiting:   { $sum: { $cond: [{ $eq: ['$status', 'Waiting'] }, 1, 0] } },
          called:    { $sum: { $cond: [{ $eq: ['$status', 'Called']  }, 1, 0] } },
          done:      { $sum: { $cond: [{ $eq: ['$status', 'Done']    }, 1, 0] } },
          lastToken: { $max: '$tokenNumber' },
        },
      },
      {
        $lookup: {
          from:         'users',
          localField:   '_id',
          foreignField: '_id',
          as:           'doctor',
        },
      },
      { $unwind: '$doctor' },
      {
        $project: {
          _id:        0,
          doctorId:   '$_id',
          doctorName: '$doctor.name',
          department: '$doctor.department',
          total:    1,
          waiting:  1,
          called:   1,
          done:     1,
          lastToken: 1,
        },
      },
      { $sort: { doctorName: 1 } },
    ]);

    res.json({ date, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/tokens/:id/status ────────────────────────────────────────────
// Body: { clinicId, status: 'Waiting' | 'Called' | 'Done' | 'Skipped' }
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { status } = req.body;
    const valid = ['Waiting', 'Called', 'Done', 'Skipped'];
    if (!valid.includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const update = { status };
    if (status === 'Called') update.calledAt = new Date();

    // Scope update to clinic so cross-clinic mutations are impossible
    const token = await Token.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      update,
      { new: true }
    )
      .populate('doctor',      'name department')
      .populate('patient',     'name patientId')
      .populate('generatedBy', 'name role');

    if (!token) return res.status(404).json({ message: 'Token not found' });
    res.json(token);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;