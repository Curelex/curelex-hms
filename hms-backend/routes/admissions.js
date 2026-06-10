// hms-backend/routes/admissions.js
const express          = require('express');
const router           = express.Router();
const auth             = require('../middleware/auth');
const Admission        = require('../models/Admission');
const Patient          = require('../models/Patient');
const ClinicRoomConfig = require('../models/ClinicRoomConfig');

// ── helpers ──────────────────────────────────────────────────────────────────
function computeDays(admissionDate, dischargeDate) {
  const a    = new Date(admissionDate);
  const d    = dischargeDate ? new Date(dischargeDate) : new Date();
  const diff = Math.max(0, Math.round((d - a) / (1000 * 60 * 60 * 24)));
  return diff || 1;
}

// ── GET /api/admissions  — list (with filters, clinic-scoped) ─────────────
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { status, patient, page = 1, limit = 20 } = req.query;

    const query = { clinicId };
    if (status)  query.status  = status;
    if (patient) query.patient = patient;

    const total = await Admission.countDocuments(query);
    const admissions = await Admission.find(query)
      .populate('patient',    'name patientId phone age gender bloodGroup')
      .populate('doctor',     'name department')
      .populate('admittedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ admissions, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admissions/active  — currently admitted patients ─────────────
router.get('/active', auth, async (req, res) => {
  try {
    const clinicId   = req.user.clinicId || 'default';
    const admissions = await Admission.find({ status: 'Admitted', clinicId })
      .populate('patient', 'name patientId phone age gender bloodGroup')
      .populate('doctor',  'name department')
      .sort({ admissionDate: -1 });
    res.json({ admissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admissions/config/room-types  — dynamic room config ──────────
router.get('/config/room-types', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    let configs    = await ClinicRoomConfig.find({ clinicId });

    if (configs.length === 0) {
      configs = [
        { roomType: 'General Ward', dailyRate: 800,  totalRooms: 5, availableRooms: 5 },
        { roomType: 'Semi-Private', dailyRate: 1500, totalRooms: 4, availableRooms: 4 },
        { roomType: 'Private Room', dailyRate: 2500, totalRooms: 3, availableRooms: 3 },
        { roomType: 'ICU',          dailyRate: 4000, totalRooms: 4, availableRooms: 4 },
      ];
    }

    res.json(configs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admissions/:id  — single admission ───────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const clinicId  = req.user.clinicId || 'default';
    const admission = await Admission.findOne({ _id: req.params.id, clinicId })
      .populate('patient',    'name patientId phone age gender bloodGroup allergies assignedDoctor')
      .populate('doctor',     'name department')
      .populate('admittedBy', 'name')
      .populate('bill');
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    res.json(admission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/admissions  — admit a patient ───────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { patientId, doctorId, roomType, roomNumber, notes } = req.body;

    if (!patientId) return res.status(400).json({ message: 'patientId is required' });

    // Verify the patient belongs to this clinic
    const patient = await Patient.findOne({ _id: patientId, clinicId });
    if (!patient) return res.status(404).json({ message: 'Patient not found in this clinic' });

    // Check if already admitted in this clinic
    const existing = await Admission.findOne({ patient: patientId, status: 'Admitted', clinicId });
    if (existing) return res.status(400).json({ message: 'Patient is already admitted' });

    // Get room config for this clinic
    let roomConfig = await ClinicRoomConfig.findOne({ clinicId, roomType });
    if (!roomConfig) {
      const defaults = {
        'General Ward': 800,
        'Semi-Private': 1500,
        'Private Room': 2500,
        'ICU':          4000,
      };
      roomConfig = { dailyRate: defaults[roomType] || 800, availableRooms: 5 };
    }

    if (roomConfig.availableRooms <= 0) {
      return res.status(400).json({ message: `No ${roomType} rooms available` });
    }

    const admission = await Admission.create({
      clinicId,
      patient:        patientId,
      doctor:         doctorId || undefined,
      admittedBy:     req.user.id,
      admittedByName: req.user.name,
      roomType:       roomType || 'General Ward',
      roomNumber:     roomNumber || '',
      roomRatePerDay: roomConfig.dailyRate,
      notes:          notes || '',
    });

    // Decrease available rooms
    await ClinicRoomConfig.updateOne(
      { clinicId, roomType },
      { $inc: { availableRooms: -1 } }
    );

    // Update patient status
    await Patient.findOneAndUpdate({ _id: patientId, clinicId }, { status: 'Active' });

    const populated = await Admission.findById(admission._id)
      .populate('patient', 'name patientId phone')
      .populate('doctor',  'name department');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Admission create error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/admissions/:id/discharge ───────────────────────────────────
router.patch('/:id/discharge', auth, async (req, res) => {
  try {
    const clinicId  = req.user.clinicId || 'default';
    const admission = await Admission.findOne({ _id: req.params.id, clinicId });
    if (!admission) return res.status(404).json({ message: 'Not found' });

    const dischargeDate = new Date();
    const daysAdmitted  = computeDays(admission.admissionDate, dischargeDate);
    const roomRent      = daysAdmitted * admission.roomRatePerDay;

    admission.status        = 'Discharged';
    admission.dischargeDate = dischargeDate;
    admission.daysAdmitted  = daysAdmitted;
    admission.roomRent      = roomRent;
    await admission.save();

    await ClinicRoomConfig.updateOne(
      { clinicId, roomType: admission.roomType },
      { $inc: { availableRooms: +1 } }
    );

    await Patient.findOneAndUpdate(
      { _id: admission.patient, clinicId },
      { status: 'Discharged' }
    );

    res.json(admission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/admissions/:id/medicines  — add medicine to log ────────────
router.post('/:id/medicines', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { medicineName, dosage, quantity, unitPrice, notes } = req.body;

    if (!medicineName) return res.status(400).json({ message: 'medicineName is required' });

    const qty   = Number(quantity)  || 1;
    const price = Number(unitPrice) || 0;

    const admission = await Admission.findOne({ _id: req.params.id, clinicId });
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    if (admission.status !== 'Admitted') return res.status(400).json({ message: 'Patient not currently admitted' });

    admission.medicineLog.push({
      medicineName,
      dosage:      dosage || '',
      quantity:    qty,
      unitPrice:   price,
      total:       qty * price,
      givenBy:     req.user.id,
      givenByName: req.user.name,
      notes:       notes || '',
    });

    await admission.save();
    res.json(admission.medicineLog[admission.medicineLog.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/admissions/:id/medicines/:medId ───────────────────────────
router.delete('/:id/medicines/:medId', auth, async (req, res) => {
  try {
    const clinicId  = req.user.clinicId || 'default';
    const admission = await Admission.findOne({ _id: req.params.id, clinicId });
    if (!admission) return res.status(404).json({ message: 'Not found' });

    admission.medicineLog = admission.medicineLog.filter(
      m => String(m._id) !== req.params.medId
    );
    await admission.save();
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/admissions/:id/followup  — add follow-up note ──────────────
router.post('/:id/followup', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { note, type, vitals } = req.body;

    if (!note) return res.status(400).json({ message: 'note is required' });

    const admission = await Admission.findOne({ _id: req.params.id, clinicId });
    if (!admission) return res.status(404).json({ message: 'Not found' });

    admission.followupLog.push({
      note,
      type:          type || 'General',
      writtenBy:     req.user.id,
      writtenByName: req.user.name,
      vitals:        vitals || {},
    });

    await admission.save();
    res.json(admission.followupLog[admission.followupLog.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admissions/:id/bill-summary ─────────────────────────────────
router.get('/:id/bill-summary', auth, async (req, res) => {
  try {
    const clinicId  = req.user.clinicId || 'default';
    const admission = await Admission.findOne({ _id: req.params.id, clinicId })
      .populate('patient', 'name patientId');
    if (!admission) return res.status(404).json({ message: 'Not found' });

    const daysAdmitted = admission.daysAdmitted ||
      computeDays(admission.admissionDate, admission.dischargeDate);
    const roomRent = daysAdmitted * admission.roomRatePerDay;

    const items = admission.medicineLog.map(m => ({
      description: `${m.medicineName}${m.dosage ? ' ' + m.dosage : ''}`,
      category:    'Medicine',
      addedByName: m.givenByName || 'Staff',
      quantity:    m.quantity,
      unitPrice:   m.unitPrice,
      total:       m.total,
      sourceRef:   String(m._id),
    }));

    res.json({
      admissionId:    admission.admissionId,
      patient:        admission.patient,
      items,
      admissionDate:  admission.admissionDate,
      dischargeDate:  admission.dischargeDate,
      daysAdmitted,
      roomType:       admission.roomType,
      roomRatePerDay: admission.roomRatePerDay,
      roomRent,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;