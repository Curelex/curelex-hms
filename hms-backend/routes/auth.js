import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
// hms-backend/routes/auth.js
import express from 'express';
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Clinic = require('../models/Clinic');
const Patient = require('../models/Patient');
const { auth } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// ── SSO Token Schema ──────────────────────────────────────────────────────
const ssoTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true },
  email:     { type: String, required: true },
  userId:    { type: String, required: true },
  role:      { type: String, default: 'staff' },
  clinicId:  { type: String, required: true },
  expiresAt: { type: Date,   required: true },
}, { timestamps: false });

const SsoToken = mongoose.models.SsoToken || mongoose.model('SsoToken', ssoTokenSchema);

// ── Register (Staff/Clinic Admin) ──────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, clinicName, phone } = req.body;

    if (!clinicName) {
      return res.status(400).json({ message: 'Clinic name is required' });
    }

    const existingClinic = await Clinic.findOne({ email });
    if (existingClinic) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const clinic = await Clinic.create({ name: clinicName, email, phone });

    const user = await User.create({
      name,
      email,
      password,
      role: 'admin',
      clinicId: clinic._id,
      permissions: [
        'dashboard', 'patients', 'ipd', 'billing',
        'prescriptions', 'pharmacy', 'lab', 'inventory',
        'room-settings', 'staff',
      ],
    });

    const token = jwt.sign(
      { id: user._id, role: user.role, clinicId: clinic._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = user.toObject();
    res.status(201).json({ token, user: userOut });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Patient Registration (creates User with role: 'patient' + Patient record) ──
router.post('/register-patient', async (req, res) => {
  try {
    const { 
      name, email, password, phone, clinicName,
      dob, age, gender, bloodGroup, address, city, state, pincode,
      emergencyContact, emergencyName, emergencyRelation,
      allergies, chronicConditions, currentMedications, medicalHistory, notes,
      assignedDoctor
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────
    if (!clinicName) {
      return res.status(400).json({ message: 'Clinic/Hospital name is required' });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    // ── Check if user exists ──────────────────────────────────────────
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // ── Check if patient exists ────────────────────────────────────────
    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(400).json({ message: 'A patient with this email already exists' });
    }

    // ── Find or create clinic ─────────────────────────────────────────
    let clinic = await Clinic.findOne({ 
      name: { $regex: new RegExp(`^${clinicName}$`, 'i') } 
    });

    if (!clinic) {
      clinic = await Clinic.create({ 
        name: clinicName, 
        email, 
        phone: phone || '',
      });
    }

    // ── STEP 1: Create User with role: 'patient' ──────────────────────
    const user = await User.create({
      name,
      email,
      password,
      role: 'patient',
      clinicId: clinic._id,
      phone: phone || '',
      permissions: ['patient-dashboard'],
      isActive: true,
    });

    // ── STEP 2: Create Patient record ──────────────────────────────────
    const patientData = {
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || phone,
      clinicId: clinic._id,
      status: 'Active',
      registrationDate: new Date(),
      registeredBy: req.user?.id || null,
    };

    // Only add fields if they have values
    if (dob) patientData.dob = new Date(dob);
    if (age) patientData.age = Number(age);
    if (gender) patientData.gender = gender;
    if (bloodGroup) patientData.bloodGroup = bloodGroup;
    if (address) patientData.address = address;
    if (city) patientData.city = city;
    if (state) patientData.state = state;
    if (pincode) patientData.pincode = pincode;
    if (emergencyContact) patientData.emergencyContact = emergencyContact;
    if (emergencyName) patientData.emergencyName = emergencyName;
    if (emergencyRelation) patientData.emergencyRelation = emergencyRelation;
    if (allergies) patientData.allergies = allergies;
    if (chronicConditions) patientData.chronicConditions = chronicConditions;
    if (currentMedications) patientData.currentMedications = currentMedications;
    if (medicalHistory) patientData.medicalHistory = medicalHistory;
    if (notes) patientData.notes = notes;
    if (assignedDoctor) patientData.assignedDoctor = assignedDoctor;

    const patient = await Patient.create(patientData);

    const { password: _, ...userOut } = user.toObject();
    
    res.status(201).json({ 
      success: true, 
      message: 'Patient registered successfully with login credentials', 
      user: userOut,
      patient: patient,
      clinic: { id: clinic._id, name: clinic.name }
    });

  } catch (err) {
    console.error('Patient registration error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ── UNIFIED LOGIN (Handles both staff and patients) ──────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = null;
    let patient = null;

    // ── STEP 1: Try to find user in User table ──────────────────────────
    user = await User.findOne({ email });

    // ── STEP 2: If user exists, verify password ─────────────────────────
    if (user) {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // If user is patient, get patient data
      if (user.role === 'patient') {
        patient = await Patient.findOne({ userId: user._id });
      }
    } else {
      // ── STEP 3: Check if patient exists in Patient table ──────────────
      patient = await Patient.findOne({ email });
      
      if (!patient) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // ── STEP 4: Check if patient already has a User account ────────────
      if (patient.userId) {
        user = await User.findById(patient.userId);
        if (user) {
          const isMatch = await user.matchPassword(password);
          if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
          }
        }
      } else {
        // ── STEP 5: Create User for patient ──────────────────────────────
        // Check if email is used by a staff account
        const staffUser = await User.findOne({ email, role: { $ne: 'patient' } });
        if (staffUser) {
          return res.status(400).json({ 
            message: 'This email is registered as a staff account' 
          });
        }

        user = await User.create({
          name: patient.name,
          email: patient.email,
          password: password,
          role: 'patient',
          clinicId: patient.clinicId,
          phone: patient.phone || '',
          permissions: ['patient-dashboard'],
          isActive: true,
        });

        patient.userId = user._id;
        await patient.save();
      }
    }

    // ── STEP 6: Validate user ────────────────────────────────────────────
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated' });
    }

    // ── STEP 7: Generate token ──────────────────────────────────────────
    const token = jwt.sign(
      { id: user._id, role: user.role, clinicId: user.clinicId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userOut } = user.toObject();
    
    // Get patient data if not already fetched
    if (user.role === 'patient' && !patient) {
      patient = await Patient.findOne({ userId: user._id });
    }
    
    res.json({ 
      token, 
      user: userOut,
      patient: patient || undefined,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Get Profile ───────────────────────────────────────────────────────────
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    let patientData = null;
    if (user.role === 'patient') {
      patientData = await Patient.findOne({ userId: user._id });
    }
    
    res.json({ user, patient: patientData });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── List Staff (admin only) ───────────────────────────────────────────────
router.get('/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    const staff = await User.find(
      { clinicId: req.user.clinicId, role: { $ne: 'patient' } },
      '-password'
    ).sort({ createdAt: -1 });

    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Create Staff (admin only) ─────────────────────────────────────────────
router.post('/users', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { name, email, password, role, department, phone, permissions } = req.body;

    if (!password) return res.status(400).json({ message: 'Password is required' });

    const exists = await User.findOne({ email, clinicId: req.user.clinicId });
    if (exists) return res.status(400).json({ message: 'Email already registered in this clinic' });

    const user = await User.create({
      name, email, password, role,
      department, phone, permissions,
      clinicId: req.user.clinicId,
    });

    const { password: _, ...userOut } = user.toObject();
    res.status(201).json(userOut);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Update Staff (admin only) ─────────────────────────────────────────────
router.put('/users/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const { password, ...fields } = req.body;

    const user = await User.findOne({ _id: req.params.id, clinicId: req.user.clinicId });
    if (!user) return res.status(404).json({ message: 'Staff member not found' });

    if (fields.email && fields.email !== user.email) {
      const conflict = await User.findOne({ email: fields.email, clinicId: req.user.clinicId });
      if (conflict) return res.status(400).json({ message: 'Email already in use in this clinic' });
    }

    Object.assign(user, fields);
    if (password) user.password = password;

    await user.save();
    const { password: _, ...userOut } = user.toObject();
    res.json(userOut);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Delete Staff (admin only) ─────────────────────────────────────────────
router.delete('/users/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, clinicId: req.user.clinicId });
    if (!user) return res.status(404).json({ message: 'Staff member not found' });
    res.json({ message: 'Staff member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Generate SSO Token for IMS ────────────────────────────────────────────
router.post('/sso-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is inactive' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await SsoToken.create({
      token,
      email: user.email,
      userId: String(user._id),
      role: user.role,
      clinicId: String(user.clinicId),
      expiresAt,
    });

    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Change Password ───────────────────────────────────────────────────────
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;