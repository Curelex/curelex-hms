const express = require('express');
const router = express.Router();
const { patientAuth } = require('../middleware/auth');
const Patient = require('../models/Patient');
const Token = require('../models/Token');
const User = require('../models/User');

// ── Helpers ──────────────────────────────────────────────────────────────
function todayStr() {
  const d   = new Date();
  const yr  = d.getFullYear();
  const mo  = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${day}`;
}

function genTransactionId() {
  return 'MOCKTXN-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
}

// ── GET /:id/dashboard ───────────────────────────────────────────────────
router.get('/:id/dashboard', patientAuth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const patientId = patient._id;

    // Count across ALL clinics
    const totalAppointments = await Token.countDocuments({ patient: patientId });
    const upcomingAppointments = await Token.countDocuments({
      patient: patientId,
      status: { $in: ['Waiting', 'Pending', 'Called'] },
    });

    res.json({
      success: true,
      data: {
        totalAppointments,
        upcomingAppointments,
        prescriptionsCount: 0,
        doctorsConsulted: 0,
        patientName: patient.name,
        patientEmail: patient.email,
        patientMobile: patient.mobile || patient.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/profile ─────────────────────────────────────────────────────
router.get('/:id/profile', patientAuth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/appointments ────────────────────────────────────────────────
router.get('/:id/appointments', patientAuth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // No clinicId filter — patient can book at any clinic
    const tokens = await Token.find({ patient: patient._id })
      .populate('doctor', 'name department consultationFee')
      .populate('clinicId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, appointments: tokens });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /doctors/:clinicId ───────────────────────────────────────────────
router.get('/doctors/:clinicId', patientAuth, async (req, res) => {
  try {
    const { clinicId } = req.params;

    const doctors = await User.find(
      { clinicId, role: 'doctor', isActive: true },
      'name department consultationFee'
    ).sort({ name: 1 });

    res.json({ success: true, doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /payments/mock ──────────────────────────────────────────────────
router.post('/payments/mock', patientAuth, async (req, res) => {
  try {
    const { doctorId, amount, method } = req.body;

    if (!doctorId || amount === undefined) {
      return res.status(400).json({ success: false, message: 'doctorId and amount are required' });
    }

    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const transactionId = genTransactionId();
    const paidAt = new Date();

    res.json({
      success: true,
      payment: {
        paymentStatus: 'paid',
        transactionId,
        paidAt,
        amount: Number(amount),
        method: method || 'card',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /:id/appointments ───────────────────────────────────────────────
router.post('/:id/appointments', patientAuth, async (req, res) => {
  try {
    const {
      name, age, gender, symptoms,
      clinicId,
      doctorId, consultationType,
      paymentStatus, transactionId, paidAt, method,
    } = req.body;

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (!name || !age || !gender || !symptoms || !doctorId || !consultationType || !clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Name, age, gender, symptoms, clinic, doctor and consultation type are required',
      });
    }

    if (!['online', 'in-person'].includes(consultationType)) {
      return res.status(400).json({ success: false, message: 'Invalid consultation type' });
    }

    if (paymentStatus !== 'paid' || !transactionId) {
      return res.status(402).json({
        success: false,
        message: 'Payment is required before a token can be created',
      });
    }

    const doctor = await User.findOne({ _id: doctorId, clinicId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found for this clinic' });
    }

    const date = todayStr();

    // ✅ FIX: scope tokenNumber per clinic + doctor + date
    // This matches the unique index: { clinicId, doctor, date, tokenNumber }
    // Previously was scoped to source:'patient' only which caused collisions
    const last = await Token.findOne({ clinicId, doctor: doctorId, date })
      .sort({ tokenNumber: -1 })
      .select('tokenNumber');
    const tokenNumber = last ? last.tokenNumber + 1 : 1;

    const token = await Token.create({
      clinicId,
      tokenNumber,
      date,
      patient: patient._id,
      patientName: name,
      age: Number(age),
      gender,
      symptoms,
      source: 'patient',
      status: 'Pending',
      doctor: doctor._id,
      consultationType,
      consultationFee: doctor.consultationFee || 0,
      paymentStatus: 'paid',
      paymentMethod: method || 'card',
      transactionId,
      paidAt: paidAt || new Date(),
    });

    await token.populate('doctor', 'name department consultationFee');

    res.status(201).json({ success: true, appointment: token });
  } catch (error) {
    // Handle race-condition duplicate key gracefully
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Token number conflict — please try again.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/prescriptions ───────────────────────────────────────────────
router.get('/:id/prescriptions', patientAuth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, prescriptions: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;