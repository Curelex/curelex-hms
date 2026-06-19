import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
// hms-backend/routes/billingRequests.js
//
// Mount in server.js:
//   app.use('/api/billing-requests', require('./routes/billingRequests'));

import express        from 'express';
const router         = express.Router();
const BillingRequest = require('../models/BillingRequest');
const Billing        = require('../models/Billing');
const {auth}           = require('../middleware/auth');

// ── GET all billing requests — scoped to clinic ───────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { status, patient } = req.query;

    const query = { clinicId }; // ← always filter by clinic
    if (status)  query.status    = status;
    if (patient) query.patientId = patient;

    const requests = await BillingRequest.find(query)
      .populate('requestedBy', 'name')
      .populate('reviewedBy',  'name')
      .populate('patient',     'name patientId')
      .populate('lab',         'labId status')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET pending count (for notification badge) — scoped to clinic ─────────
router.get('/pending-count', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const count = await BillingRequest.countDocuments({ clinicId, status: 'Pending' });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET pending requests for a specific patient — scoped to clinic ────────
router.get('/patient/:patientMongoId', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const requests = await BillingRequest.find({
      clinicId,                              // ← scoped
      patient: req.params.patientMongoId,
      status:  'Approved',
      billing: { $exists: false },
    }).sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST approve a billing request ────────────────────────────────────────
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const breq = await BillingRequest.findOne({ _id: req.params.id, clinicId });
    if (!breq)                     return res.status(404).json({ message: 'Request not found' });
    if (breq.status !== 'Pending') return res.status(400).json({ message: 'Request already reviewed' });

    breq.status     = 'Approved';
    breq.reviewedBy = req.user.id;
    breq.reviewedAt = new Date();

    if (req.body.billingId) {
      const bill = await Billing.findOne({ _id: req.body.billingId, clinicId });
      if (bill) {
        const newItems = breq.tests.map(t => ({
          description: t.testName,
          category:    'Lab',
          addedBy:     req.user.id,
          addedByName: req.user.name || '',
          quantity:    1,
          unitPrice:   t.price,
          total:       t.price,
          sourceRef:   breq.labId,
        }));
        bill.items.push(...newItems);
        bill.subtotal    = bill.items.reduce((s, i) => s + (i.total || 0), 0) + (bill.roomRent || 0);
        bill.totalAmount = bill.subtotal - (bill.discount || 0) + (bill.subtotal * (bill.tax || 0)) / 100;
        await bill.save();
        breq.billing = bill._id;
      }
    }

    await breq.save();
    res.json(breq);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST reject a billing request ─────────────────────────────────────────
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const breq = await BillingRequest.findOne({ _id: req.params.id, clinicId });
    if (!breq)                     return res.status(404).json({ message: 'Request not found' });
    if (breq.status !== 'Pending') return res.status(400).json({ message: 'Request already reviewed' });

    breq.status       = 'Rejected';
    breq.reviewedBy   = req.user.id;
    breq.reviewedAt   = new Date();
    breq.rejectReason = req.body.rejectReason || '';
    await breq.save();

    res.json(breq);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;