import env from '../config/env.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: token missing' });
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Unauthorized: invalid user' });
    }

    req.user = user;
    // ── ADDED: always attach clinicId from JWT (covers SSO flow) ──
    req.user.clinicId = decoded.clinicId || user.clinicId || null;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: invalid token' });
  }
};