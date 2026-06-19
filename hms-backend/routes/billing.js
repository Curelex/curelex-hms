import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
// hms-backend/routes/billing.js
const router   = require('express').Router();
const Billing  = require('../models/Billing');
const Pharmacy = require('../models/Pharmacy');
const Lab      = require('../models/Lab');
const {auth}     = require('../middleware/auth');

const ROOM_RATES = {
  'General Ward': 800,
  'Semi-Private':  1500,
  'Private Room':  2500,
  'ICU':           4000,
};

// ────────────────────────────────────────────────────────────────────────────
//  GET /billing/check-patient/:patientId
//  Returns the existing bill for this patient within the same clinic
// ────────────────────────────────────────────────────────────────────────────
router.get('/check-patient/:patientId', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const existing = await Billing.findOne({ patient: req.params.patientId, clinicId })
      .populate('patient', 'name patientId phone age gender bloodGroup')
      .sort({ createdAt: -1 });

    if (!existing) return res.json({ exists: false });
    res.json({ exists: true, bill: existing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /billing/patient-items/:patientId
//  Auto-fetch medicines + lab tests scoped to clinic
// ────────────────────────────────────────────────────────────────────────────
router.get('/patient-items/:patientId', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { patientId } = req.params;

    const prescriptions = await Pharmacy.find({ patient: patientId, clinicId })
      .populate('dispensedBy', 'name')
      .sort({ createdAt: -1 });

    const labTests = await Lab.find({ patient: patientId, clinicId })
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

// ────────────────────────────────────────────────────────────────────────────
//  GET /billing  — list bills for this clinic only
// ────────────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { status, patient, page = 1, limit = 15 } = req.query;

    const query = { clinicId }; // ← scoped
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

// ────────────────────────────────────────────────────────────────────────────
//  GET /billing/:id — verify clinic ownership
// ────────────────────────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const bill = await Billing.findOne({ _id: req.params.id, clinicId })
      .populate('patient')
      .populate('appointment')
      .populate('generatedBy', 'name');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  POST /billing  — create new bill
//  Duplicate guard is now clinic-scoped too
// ────────────────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const body = { ...req.body, clinicId, generatedBy: req.user.id };

    // ── Duplicate guard (scoped to clinic) ──────────────────────────────
    const existing = await Billing.findOne({ patient: body.patient, clinicId })
      .populate('patient', 'name patientId phone age gender bloodGroup')
      .sort({ createdAt: -1 });

    if (existing) {
      return res.status(409).json({
        duplicate: true,
        message:   `A bill already exists for this patient (${existing.billId}).`,
        bill:      existing,
      });
    }

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

// ────────────────────────────────────────────────────────────────────────────
//  PUT /billing/:id  — update bill (scoped to clinic)
// ────────────────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const body = { ...req.body };

    if (body.roomType) body.roomRatePerDay = ROOM_RATES[body.roomType] || 800;
    if (body.daysAdmitted != null && body.roomRatePerDay != null) {
      body.roomRent = Number(body.daysAdmitted) * Number(body.roomRatePerDay);
    }

    const bill = await Billing.findOneAndUpdate(
      { _id: req.params.id, clinicId }, // ← scoped
      body,
      { new: true }
    ).populate('patient', 'name patientId phone age gender bloodGroup');

    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;