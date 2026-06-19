// hms-backend/middleware/auth.js
import jwt from 'jsonwebtoken';

// ── Staff / Admin Authentication ─────────────────────────────────────────
// Used by clinic staff routes. Requires clinicId inside the JWT.
const auth = function (req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.clinicId) {
      return res.status(401).json({ message: 'Invalid token: missing clinicId' });
    }

    req.user     = decoded; // { id, role, clinicId }
    req.userId   = decoded.id;
    req.clinicId = decoded.clinicId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// ── Clinic middleware ─────────────────────────────────────────────────────
// Resolves clinicId from multiple possible sources (header, query, body, JWT).
const clinic = function (req, res, next) {
  const clinicId =
    req.header('X-Clinic-Id') ||
    req.query.clinicId ||
    req.body.clinicId ||
    req.clinicId;

  if (!clinicId) {
    return res.status(400).json({
      success: false,
      message: 'Clinic ID is required',
    });
  }

  req.clinicId = clinicId;
  next();
};

// ── Patient Authentication ────────────────────────────────────────────────
// Used by patient portal routes. Does NOT require clinicId in the JWT
// because patients' clinicId is resolved from their Patient DB record instead.
const patientAuth = function (req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user     = decoded;             // { id, role, clinicId? }
    req.userId   = decoded.id;
    req.clinicId = decoded.clinicId || null; // optional — routes resolve from DB
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = { auth, clinic, patientAuth };