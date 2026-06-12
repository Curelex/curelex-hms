// routes/patientRecords.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PatientRecord = require('../models/PatientRecord');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// ── Multer config ─────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads', 'patient-records');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) cb(null, true);
    else cb(new Error('Only images, PDFs, and documents are allowed'));
  }
});

// ── Helper ────────────────────────────────────────────────────────────────────
const getOrCreateRecord = async ({ patientId, patientCode, tokenId, doctorId, clinicId }) => {
  // One record per token visit; create if not exists
  let record = tokenId
    ? await PatientRecord.findOne({ tokenId })
    : null;

  if (!record) {
    record = new PatientRecord({ patientId, patientCode, tokenId, doctorId, clinicId });
    await record.save();
  }
  return record;
};

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/patient-records/:patientId
 * All visit records for a patient (used when patient comes again)
 */
router.get('/:patientId', auth, async (req, res) => {
  try {
    const records = await PatientRecord
      .find({ patientId: req.params.patientId })
      .populate('doctorId', 'name specialization')
      .populate('tokenId', 'tokenNumber status')
      .sort({ visitDate: -1 });

    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/patient-records/by-token/:tokenId
 * Record for a specific token
 */
router.get('/by-token/:tokenId', auth, async (req, res) => {
  try {
    const record = await PatientRecord
      .findOne({ tokenId: req.params.tokenId })
      .populate('doctorId', 'name specialization');
    res.json({ success: true, record: record || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/patient-records/upload-file
 * Upload a file for a patient visit
 */
router.post('/upload-file', auth, upload.single('file'), async (req, res) => {
  try {
    const { patientId, patientCode, tokenId, doctorId, clinicId, label } = req.body;

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const record = await getOrCreateRecord({ patientId, patientCode, tokenId, doctorId, clinicId });

    const fileEntry = {
      filename: req.file.originalname,
      storedName: req.file.filename,
      path: `/uploads/patient-records/${req.file.filename}`,
      mimetype: req.file.mimetype,
      size: req.file.size,
      label: label || 'Report',
      uploadedAt: new Date()
    };

    record.files.push(fileEntry);
    await record.save();

    res.json({ success: true, file: fileEntry, recordId: record._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/patient-records/:recordId/file/:fileId
 * Delete a specific uploaded file
 */
router.delete('/:recordId/file/:fileId', auth, async (req, res) => {
  try {
    const record = await PatientRecord.findById(req.params.recordId);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    const fileEntry = record.files.id(req.params.fileId);
    if (!fileEntry) return res.status(404).json({ success: false, message: 'File not found' });

    // Delete from disk
    const filePath = path.join(__dirname, '..', fileEntry.path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    record.files.pull(req.params.fileId);
    await record.save();

    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/patient-records/follow-up
 * Add a follow-up date
 */
router.post('/follow-up', auth, async (req, res) => {
  try {
    const { patientId, patientCode, tokenId, doctorId, clinicId, date, note } = req.body;

    if (!date) return res.status(400).json({ success: false, message: 'Follow-up date is required' });

    const record = await getOrCreateRecord({ patientId, patientCode, tokenId, doctorId, clinicId });

    const followUp = { date: new Date(date), note: note || '', status: 'scheduled' };
    record.followUps.push(followUp);
    await record.save();

    res.json({ success: true, followUp, recordId: record._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/patient-records/:recordId/follow-up/:followUpId
 * Update a follow-up status
 */
router.patch('/:recordId/follow-up/:followUpId', auth, async (req, res) => {
  try {
    const record = await PatientRecord.findById(req.params.recordId);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    const fu = record.followUps.id(req.params.followUpId);
    if (!fu) return res.status(404).json({ success: false, message: 'Follow-up not found' });

    if (req.body.status) fu.status = req.body.status;
    if (req.body.date) fu.date = new Date(req.body.date);
    if (req.body.note !== undefined) fu.note = req.body.note;

    await record.save();
    res.json({ success: true, followUp: fu });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/patient-records/search/:patientCode
 * Search patient records by patient code (e.g. PAT00002)
 */
router.get('/search/:patientCode', auth, async (req, res) => {
  try {
    const records = await PatientRecord
      .find({ patientCode: req.params.patientCode })
      .populate('doctorId', 'name specialization')
      .populate('tokenId', 'tokenNumber status')
      .sort({ visitDate: -1 });

    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;