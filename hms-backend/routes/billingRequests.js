// hms-backend/routes/billingRequests.js
//
// Mount in server.js:
//   app.use('/api/billing-requests', require('./routes/billingRequests'));

const express        = require('express');
const router         = express.Router();
const BillingRequest = require('../models/BillingRequest');
const Billing        = require('../models/Billing');
const auth           = require('../middleware/auth');

// ── GET all billing requests (billing staff / admin) ─────────────────────────
// Query params: status=Pending|Approved|Rejected  patient=<patientId string>
router.get('/', auth, async (req, res) => {
  try {
    const { status, patient } = req.query;
    const query = {};
    if (status)  query.status    = status;
    if (patient) query.patientId = patient;   // patientId string e.g. PAT00003

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

// ── GET pending count (for notification badge) ────────────────────────────────
router.get('/pending-count', auth, async (req, res) => {
  try {
    const count = await BillingRequest.countDocuments({ status: 'Pending' });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET pending requests for a specific patient ───────────────────────────────
// Used by billing page to auto-fetch lab items when creating a bill
router.get('/patient/:patientMongoId', auth, async (req, res) => {
  try {
    const requests = await BillingRequest.find({
      patient: req.params.patientMongoId,
      status:  'Approved',
      billing: { $exists: false },   // not yet attached to any bill
    }).sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST approve a billing request ───────────────────────────────────────────
// Body: { billingId? }  — optionally attach to existing bill immediately
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const breq = await BillingRequest.findById(req.params.id);
    if (!breq)                        return res.status(404).json({ message: 'Request not found' });
    if (breq.status !== 'Pending')    return res.status(400).json({ message: 'Request already reviewed' });

    breq.status     = 'Approved';
    breq.reviewedBy = req.user.id;
    breq.reviewedAt = new Date();

    // If caller passes an existing billingId, append items right now
    if (req.body.billingId) {
      const bill = await Billing.findById(req.body.billingId);
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
        // Recalculate subtotal & totalAmount
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

// ── POST reject a billing request ────────────────────────────────────────────
// Body: { rejectReason }
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const breq = await BillingRequest.findById(req.params.id);
    if (!breq)                      return res.status(404).json({ message: 'Request not found' });
    if (breq.status !== 'Pending')  return res.status(400).json({ message: 'Request already reviewed' });

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

module.exports = router;