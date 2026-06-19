import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
// hms-backend/routes/patients.js
const router = require('express').Router();
const Patient = require('../models/Patient');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// ── Get all patients ──────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { search, status, page = 1, limit = 20 } = req.query;

    let query = { clinicId };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { patientId: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    if (status) query.status = status;

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .populate('assignedDoctor', 'name department')
      .populate('registeredBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ patients, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get single patient ──────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const patient = await Patient.findOne({ _id: req.params.id, clinicId })
      .populate('assignedDoctor', 'name department')
      .populate('registeredBy', 'name')
      .populate('userId', 'email role isActive');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Create patient (with optional user account) ──────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { 
      name, email, phone, dob, age, gender, bloodGroup,
      address, city, state, pincode,
      emergencyContact, emergencyName, emergencyRelation,
      allergies, chronicConditions, currentMedications, medicalHistory,
      assignedDoctor, notes,
      createLogin, password
    } = req.body;

    // Check if patient already exists
    const existingPatient = await Patient.findOne({ email, clinicId });
    if (existingPatient) {
      return res.status(400).json({ message: 'Patient with this email already exists' });
    }

    let user = null;

    // ── If createLogin is true, create User account ──────────────────────
    if (createLogin && password) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }

      // Create User with role: 'patient'
      user = await User.create({
        name,
        email,
        password,
        role: 'patient',
        clinicId: clinicId,
        phone: phone || '',
        permissions: ['patient-dashboard'],
        isActive: true,
      });
    }

    // ── Create Patient ──────────────────────────────────────────────────────
    const patient = new Patient({
      userId: user?._id || null,
      name,
      email,
      phone,
      dob: dob || null,
      age: age || null,
      gender: gender || null,
      bloodGroup: bloodGroup || null,
      address: address || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      emergencyContact: emergencyContact || '',
      emergencyName: emergencyName || '',
      emergencyRelation: emergencyRelation || '',
      allergies: allergies || '',
      chronicConditions: chronicConditions || '',
      currentMedications: currentMedications || '',
      medicalHistory: medicalHistory || '',
      notes: notes || '',
      assignedDoctor: assignedDoctor || null,
      clinicId: clinicId,
      status: 'Active',
      registrationDate: new Date(),
      registeredBy: req.user.id,
    });

    await patient.save();
    await patient.populate('assignedDoctor', 'name department');
    await patient.populate('registeredBy', 'name');

    res.status(201).json({ 
      success: true, 
      message: createLogin && user ? 'Patient registered with login credentials' : 'Patient registered successfully',
      patient,
      user: user ? { id: user._id, email: user.email, role: user.role } : null
    });
  } catch (err) {
    console.error('Create patient error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Update patient ─────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const body = { ...req.body };
    
    delete body._id;
    delete body.clinicId;
    delete body.patientId;
    delete body.userId;

    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      body,
      { new: true, runValidators: true }
    ).populate('assignedDoctor', 'name department')
     .populate('registeredBy', 'name');

    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    console.error('Update patient error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Delete patient ─────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    
    const patient = await Patient.findOne({ _id: req.params.id, clinicId });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // If patient has a user account, delete it too
    if (patient.userId) {
      await User.findByIdAndDelete(patient.userId);
    }

    await Patient.findOneAndDelete({ _id: req.params.id, clinicId });
    res.json({ message: 'Patient and associated user account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;