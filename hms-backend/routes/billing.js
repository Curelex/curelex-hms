// hms-backend/routes/billing.js
const router   = require('express').Router();
const Billing  = require('../models/Billing');
const Pharmacy = require('../models/Pharmacy');
const Lab      = require('../models/Lab');
const auth     = require('../middleware/auth');

const ROOM_RATES = {
  'General Ward': 800,
  'Semi-Private':  1500,
  'Private Room':  2500,
  'ICU':           4000,
};

// ────────────────────────────────────────────────────────────────
//  GET /billing/check-patient/:patientId
//  Returns the existing bill for a patient if one exists (any status)
//  Frontend uses this when a patient is selected in Create Bill.
// ────────────────────────────────────────────────────────────────
router.get('/check-patient/:patientId', auth, async (req, res) => {
  try {
    // Most recent bill for this patient regardless of status
    const existing = await Billing.findOne({ patient: req.params.patientId })
      .populate('patient', 'name patientId phone age gender bloodGroup')
      .sort({ createdAt: -1 });

    if (!existing) return res.json({ exists: false });
    res.json({ exists: true, bill: existing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ────────────────────────────────────────────────────────────────
//  GET /billing/patient-items/:patientId
//  Auto-fetch medicines + lab tests for pre-populating bill items
// ────────────────────────────────────────────────────────────────
router.get('/patient-items/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;

    const prescriptions = await Pharmacy.find({ patient: patientId })
      .populate('dispensedBy', 'name')
      .sort({ createdAt: -1 });

    const labTests = await Lab.find({ patient: patientId })
      .populate('doctor', 'name')
      .sort({ createdAt: -1 });

    const medicineItems = [];
    prescriptions.forEach(rx => {
      rx.medicines.forEach(med => {
        medicineItems.push({
          description: `${med.name}${med.dosage ? ' ' + med.dosage : ''}`,
          category:    'Medicine',
          addedByName: rx.dispensedBy?.name || 'Pharmacy',
          quantity:    med.quantity || 1,
          unitPrice:   med.unitPrice || 0,
          total:       med.total || (med.quantity * (med.unitPrice || 0)),
          sourceRef:   rx.prescriptionId,
        });
      });
    });

    const labItems = labTests.map(t => ({
      description: t.testType || t.testName || 'Lab Test',
      category:    'Lab',
      addedByName: t.doctor?.name || 'Lab',
      quantity:    1,
      unitPrice:   t.price || t.cost || 0,
      total:       t.price || t.cost || 0,
      sourceRef:   t._id?.toString(),
    }));

    res.json({
      items: [...medicineItems, ...labItems],
      summary: { totalMedicines: medicineItems.length, totalLabTests: labItems.length },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ────────────────────────────────────────────────────────────────
//  GET /billing  — list all bills
// ────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { status, patient, page = 1, limit = 15 } = req.query;
    const query = {};
    if (status)  query.paymentStatus = status;
    if (patient) query.patient = patient;

    const total = await Billing.countDocuments(query);
    const bills = await Billing.find(query)
      .populate('patient',     'name patientId phone')
      .populate('generatedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ bills, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ────────────────────────────────────────────────────────────────
//  GET /billing/:id
// ────────────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await Billing.findById(req.params.id)
      .populate('patient')
      .populate('appointment')
      .populate('generatedBy', 'name');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ────────────────────────────────────────────────────────────────
//  POST /billing  — create new bill
//  GUARD: if a bill already exists for this patient → reject with
//  { duplicate: true, bill: existingBill } so frontend can redirect
//  to edit mode instead.
// ────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const body = { ...req.body, generatedBy: req.user.id };

    // ── Duplicate guard ───────────────────────────────────────
    const existing = await Billing.findOne({ patient: body.patient })
      .populate('patient', 'name patientId phone age gender bloodGroup')
      .sort({ createdAt: -1 });

    if (existing) {
      // Tell frontend to switch to edit mode with the existing bill
      return res.status(409).json({
        duplicate: true,
        message:   `A bill already exists for this patient (${existing.billId}).`,
        bill:      existing,
      });
    }

    // ── Normal create ─────────────────────────────────────────
    if (body.roomType) body.roomRatePerDay = ROOM_RATES[body.roomType] || 800;
    if (body.daysAdmitted && body.roomRatePerDay) {
      body.roomRent = Number(body.daysAdmitted) * Number(body.roomRatePerDay);
    }

    const bill      = await Billing.create(body);
    const populated = await Billing.findById(bill._id)
      .populate('patient', 'name patientId phone age gender bloodGroup');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ────────────────────────────────────────────────────────────────
//  PUT /billing/:id  — update / append items to existing bill
// ────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const body = { ...req.body };

    if (body.roomType) body.roomRatePerDay = ROOM_RATES[body.roomType] || 800;
    if (body.daysAdmitted != null && body.roomRatePerDay != null) {
      body.roomRent = Number(body.daysAdmitted) * Number(body.roomRatePerDay);
    }

    const bill = await Billing.findByIdAndUpdate(req.params.id, body, { new: true })
      .populate('patient', 'name patientId phone age gender bloodGroup');
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;