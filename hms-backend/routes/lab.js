// hms-backend/routes/lab.js
const router = require('express').Router();
const Lab            = require('../models/Lab');
const BillingRequest = require('../models/BillingRequest');
const Patient        = require('../models/Patient');
const auth           = require('../middleware/auth');

// ── GET all lab tests ─────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { status, patient, page = 1, limit = 20 } = req.query;
    let query = {};
    if (status)  query.status  = status;
    if (patient) query.patient = patient;

    const total = await Lab.countDocuments(query);
    const labs  = await Lab.find(query)
      .populate('patient',   'name patientId')
      .populate('orderedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ labs, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET single lab test ───────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const lab = await Lab.findById(req.params.id)
      .populate('patient')
      .populate('orderedBy', 'name department');
    if (!lab) return res.status(404).json({ message: 'Lab test not found' });
    res.json(lab);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST create lab order ─────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const lab = await Lab.create({ ...req.body, orderedBy: req.user.id });
    res.status(201).json(lab);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT update lab order ──────────────────────────────────────────────────────
// KEY CHANGE: when status flips to 'Completed' a BillingRequest is auto-created
// (idempotent – only one request per lab order ever gets created)
router.put('/:id', auth, async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.body.status === 'Completed')        data.reportGeneratedAt = new Date();
    if (req.body.status === 'Sample Collected') data.sampleCollectedAt = new Date();

    const lab = await Lab.findByIdAndUpdate(req.params.id, data, { new: true })
      .populate('patient', 'name patientId');

    if (!lab) return res.status(404).json({ message: 'Lab not found' });

    // ── Auto-create BillingRequest when lab is marked Completed ──────────────
    if (req.body.status === 'Completed') {
      const alreadyExists = await BillingRequest.findOne({ lab: lab._id });

      if (!alreadyExists) {
        const testLines = (lab.tests || []).map(t => ({
          testName: t.testName,
          price:    t.price || 0,
        }));

        await BillingRequest.create({
          lab:             lab._id,
          labId:           lab.labId,
          patient:         lab.patient._id,
          patientId:       lab.patient.patientId,
          patientName:     lab.patient.name,
          tests:           testLines,
          totalAmount:     lab.totalAmount || 0,
          requestedBy:     req.user.id,
          requestedByName: req.user.name || '',
          status:          'Pending',
        });
      }
    }

    res.json(lab);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;