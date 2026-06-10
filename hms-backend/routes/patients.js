// hms-backend/routes/patients.js
const router  = require('express').Router();
const Patient = require('../models/Patient');
const auth    = require('../middleware/auth');

// ── Get all patients — scoped to clinic ────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { search, status, page = 1, limit = 20 } = req.query;

    let query = { clinicId }; // ← always filter by clinic
    if (search) query.$or = [
      { name:      { $regex: search, $options: 'i' } },
      { patientId: { $regex: search, $options: 'i' } },
      { phone:     { $regex: search, $options: 'i' } },
    ];
    if (status) query.status = status;

    const total    = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .populate('assignedDoctor', 'name department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ patients, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get single patient — verify it belongs to this clinic ─────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const patient  = await Patient.findOne({ _id: req.params.id, clinicId })
      .populate('assignedDoctor', 'name department');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Create patient — stamp with clinicId ───────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const body = { ...req.body, clinicId }; // ← inject clinic
    if (!body.assignedDoctor) delete body.assignedDoctor;
    if (!body.dob)            delete body.dob;

    const patient = new Patient(body);
    await patient.save();
    await patient.populate('assignedDoctor', 'name department');
    res.status(201).json(patient);
  } catch (err) {
    console.error('Create patient error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Update patient — must belong to this clinic ────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const body = { ...req.body };
    if (!body.assignedDoctor) delete body.assignedDoctor;
    if (!body.dob)            delete body.dob;

    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, clinicId }, // ← scoped update
      body,
      { new: true, runValidators: true }
    ).populate('assignedDoctor', 'name department');

    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    console.error('Update patient error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── Delete patient — must belong to this clinic ────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const result   = await Patient.findOneAndDelete({ _id: req.params.id, clinicId });
    if (!result) return res.status(404).json({ message: 'Patient not found' });
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;