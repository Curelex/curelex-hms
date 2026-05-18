// hms-backend/routes/patients.js
const router  = require('express').Router();
const Patient = require('../models/Patient');
const auth    = require('../middleware/auth');

// ── Get all patients ───────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    let query = {};
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

// ── Get single patient ─────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('assignedDoctor', 'name department');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Create patient ─────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    // Strip empty assignedDoctor so Mongoose doesn't try to cast "" to ObjectId
    const body = { ...req.body };
    if (!body.assignedDoctor) delete body.assignedDoctor;
    if (!body.dob)            delete body.dob;

    const patient = new Patient(body);
    await patient.save();                          // triggers pre-save hook

    // Return populated doctor info so frontend token modal works
    await patient.populate('assignedDoctor', 'name department');
    res.status(201).json(patient);
  } catch (err) {
    console.error('Create patient error:', err);   // log full error server-side
    res.status(500).json({ message: err.message });
  }
});

// ── Update patient ─────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.assignedDoctor) delete body.assignedDoctor;
    if (!body.dob)            delete body.dob;

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
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

// ── Delete patient ─────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    res.json({ message: 'Patient deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;