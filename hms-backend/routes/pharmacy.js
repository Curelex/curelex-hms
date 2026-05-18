// hms-backend/routes/pharmacy.js
const router         = require('express').Router();
const Pharmacy       = require('../models/Pharmacy');
const Inventory      = require('../models/Inventory');
const Billing        = require('../models/Billing');
const BillingRequest = require('../models/BillingRequest');
const Admission      = require('../models/Admission');
const auth           = require('../middleware/auth');

// ── GET /pharmacy/inventory/search?q=  ───────────────────────────────────────
// MUST be before /:id route to avoid conflict
router.get('/inventory/search', auth, async (req, res) => {
  try {
    const { q = '' } = req.query;
    const items = await Inventory.find({
      name:     { $regex: q, $options: 'i' },
      category: 'Medicine',
      quantity: { $gt: 0 },
    }).select('name unitPrice quantity unit').limit(15);
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET all prescriptions ─────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { status, patient, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status)  query.status  = status;
    if (patient) query.patient = patient;

    const total = await Pharmacy.countDocuments(query);
    const prescriptions = await Pharmacy.find(query)
      .populate('patient',     'name patientId phone')
      .populate('dispensedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ prescriptions, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET single prescription ───────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const rx = await Pharmacy.findById(req.params.id)
      .populate('patient')
      .populate('dispensedBy', 'name');
    if (!rx) return res.status(404).json({ message: 'Prescription not found' });
    res.json(rx);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST create prescription ──────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.patient) return res.status(400).json({ message: 'Patient is required' });

    // Check admission at creation time — save isIPD so it persists on the record
    const activeAdmission = await Admission.findOne({
      patient: body.patient,
      status:  'Admitted',
    });
    body.isIPD = !!activeAdmission;

    const rx = new Pharmacy(body);
    await rx.save();
    await rx.populate('patient', 'name patientId phone');
    res.status(201).json(rx);
  } catch (err) {
    console.error('Pharmacy create error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── PUT update prescription ───────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.body.status === 'Dispensed') {
      data.dispensedBy = req.user.id;
      data.dispensedAt = new Date();
    }
    const rx = await Pharmacy.findByIdAndUpdate(req.params.id, data, { new: true })
      .populate('patient', 'name patientId phone');
    res.json(rx);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /pharmacy/:id/dispense ───────────────────────────────────────────────
//
//  OPD flow:
//    1. Stock check → deduct inventory
//    2. Mark Dispensed
//    3. Create/update Billing doc, mark Paid immediately (Cash/UPI/Card)
//
//  IPD flow:
//    1. Stock check → deduct inventory
//    2. Mark Dispensed
//    3. Append medicines to admission.medicineLog
//    4. Create BillingRequest → billing dept approves → auto-added to patient bill
//
router.post('/:id/dispense', auth, async (req, res) => {
  try {
    const { paymentMethod = 'Cash' } = req.body;

    const rx = await Pharmacy.findById(req.params.id)
      .populate('patient', 'name patientId phone');

    if (!rx)                       return res.status(404).json({ message: 'Prescription not found' });
    if (rx.status === 'Dispensed') return res.status(400).json({ message: 'Already dispensed' });
    if (rx.status === 'Cancelled') return res.status(400).json({ message: 'Prescription is cancelled' });

    // ── STEP 1: Stock check — all-or-nothing before any changes ─────────────
    const stockErrors = [];
    for (const med of rx.medicines) {
      const escaped = med.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const item = await Inventory.findOne({
        name:     { $regex: new RegExp(`^${escaped}$`, 'i') },
        category: 'Medicine',
      });
      if (!item) {
        stockErrors.push(`"${med.name}" not found in inventory`);
      } else if (item.quantity < med.quantity) {
        stockErrors.push(`"${med.name}" insufficient stock (have ${item.quantity}, need ${med.quantity})`);
      }
    }
    if (stockErrors.length > 0) {
      return res.status(400).json({ message: 'Stock check failed.', stockErrors });
    }

    // ── STEP 2: Deduct stock ─────────────────────────────────────────────────
    for (const med of rx.medicines) {
      const escaped = med.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const item = await Inventory.findOne({
        name:     { $regex: new RegExp(`^${escaped}$`, 'i') },
        category: 'Medicine',
      });
      item.quantity -= med.quantity;
      item.transactions.push({
        type:        'OUT',
        quantity:    med.quantity,
        reason:      `Dispensed — ${rx.prescriptionId} (${rx.patient?.name})`,
        performedBy: req.user.id,
        date:        new Date(),
      });
      await item.save();
    }

    // ── STEP 3: Mark dispensed ───────────────────────────────────────────────
    rx.status      = 'Dispensed';
    rx.dispensedBy = req.user.id;
    rx.dispensedAt = new Date();
    await rx.save();

    // ── STEP 4: Determine OPD vs IPD ────────────────────────────────────────
    // Live admission check first; fall back to saved isIPD on record
    const activeAdmission = await Admission.findOne({
      patient: rx.patient._id,
      status:  'Admitted',
    });
    const isIPD = !!activeAdmission || rx.isIPD;

    // ════════════════════════════════════════════════════════════════════════
    //  IPD FLOW
    // ════════════════════════════════════════════════════════════════════════
    if (isIPD && activeAdmission) {

      // 4a. Append to admission medicine log
      for (const med of rx.medicines) {
        activeAdmission.medicineLog.push({
          medicineName:  med.name,
          dosage:        med.dosage        || '',
          quantity:      med.quantity,
          unitPrice:     med.unitPrice     || 0,
          total:         med.total         || 0,
          givenBy:       req.user.id,
          givenByName:   req.user.name     || '',
          notes:         med.instructions  || '',
        });
      }
      await activeAdmission.save();

      // 4b. Create BillingRequest (idempotent)
      const alreadyExists = await BillingRequest.findOne({ pharmacy: rx._id });
      if (!alreadyExists) {
        const breq = await BillingRequest.create({
          type:            'Pharmacy',
          pharmacy:        rx._id,
          pharmacyId:      rx.prescriptionId,
          patient:         rx.patient._id,
          patientId:       rx.patient.patientId,
          patientName:     rx.patient.name,
          tests:           rx.medicines.map(m => ({
            testName: `${m.name}${m.dosage ? ' ' + m.dosage : ''}`,
            price:    m.total || ((m.quantity || 0) * (m.unitPrice || 0)),
          })),
          totalAmount:     rx.totalAmount,
          requestedBy:     req.user.id,
          requestedByName: req.user.name || '',
          status:          'Pending',
        });

        return res.json({
          rx,
          flow:           'IPD',
          billingRequest: breq,
          message:        `Medicines dispensed & logged to admission. Billing request ${breq.requestId} sent to billing dept for approval.`,
        });
      }

      return res.json({
        rx,
        flow:    'IPD',
        message: 'Dispensed & logged to admission. Billing request already exists.',
      });

    // ════════════════════════════════════════════════════════════════════════
    //  OPD FLOW
    // ════════════════════════════════════════════════════════════════════════
    } else {

      const billItems = rx.medicines.map(m => ({
        description: `${m.name}${m.dosage ? ' (' + m.dosage + ')' : ''}`,
        category:    'Medicine',
        addedByName: req.user.name || 'Pharmacy',
        quantity:    m.quantity,
        unitPrice:   m.unitPrice || 0,
        total:       m.total     || 0,
        sourceRef:   rx.prescriptionId,
      }));

      // Append to existing bill or create new one
      let bill = await Billing.findOne({ patient: rx.patient._id }).sort({ createdAt: -1 });

      if (bill) {
        const alreadyAdded = bill.items.some(i => i.sourceRef === rx.prescriptionId);
        if (!alreadyAdded) {
          bill.items.push(...billItems);
          const itemsTotal   = bill.items.reduce((s, i) => s + (i.total || 0), 0);
          bill.subtotal      = itemsTotal + (bill.roomRent || 0);
          bill.totalAmount   = bill.subtotal - (bill.discount || 0) + (bill.subtotal * (bill.tax || 0) / 100);
          bill.paidAmount    = bill.totalAmount;
          bill.paymentStatus = 'Paid';
          bill.paymentMethod = paymentMethod;
          await bill.save();
        }
      } else {
        bill = new Billing({
          patient:       rx.patient._id,
          items:         billItems,
          subtotal:      rx.totalAmount,
          totalAmount:   rx.totalAmount,
          paidAmount:    rx.totalAmount,
          paymentMethod,
          paymentStatus: 'Paid',
          generatedBy:   req.user.id,
        });
        await bill.save();
      }

      await bill.populate('patient', 'name patientId phone');

      return res.json({
        rx,
        flow:    'OPD',
        bill,
        message: `Medicines dispensed. Bill ${bill.billId} of ₹${rx.totalAmount} generated & paid (${paymentMethod}).`,
      });
    }

  } catch (err) {
    console.error('Dispense error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;