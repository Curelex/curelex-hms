import jwt from "jsonwebtoken";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import env from "../config/env.js";
import { STAFF_PERMISSIONS, ROLES } from "../utils/permissions.js";
import User from "../models/User.js";
import SsoToken from "../models/SsoToken.js";

const signToken = (userId, clinicId = null) =>
  jwt.sign({ id: userId, clinicId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const signup = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409);
    throw new Error("Email already exists");
  }
  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    password,
    role: ROLES.STAFF,
    permissions: STAFF_PERMISSIONS.SALES_BILLING,
  });

  const token = signToken(user._id, user.clinicId);
  res.status(201).json({
    token,
    user: {
      id:       user._id,
      fullName: user.fullName,
      email:    user.email,
      role:     user.role,
      clinicId: user.clinicId,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid credentials");
  }
  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user._id, user.clinicId);
  res.json({
    token,
    user: {
      id:          user._id,
      fullName:    user.fullName,
      email:       user.email,
      role:        user.role,
      permissions: user.permissions,
      clinicId:    user.clinicId,
    },
  });
});

export const ssoExchange = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400);
    throw new Error("SSO token required");
  }

  // ── Look up the one-time token record ──
  const record = await SsoToken.findOneAndDelete({ token });
  if (!record) {
    res.status(401);
    throw new Error("Invalid or expired SSO token");
  }

  // ── Guard: reject if already expired ──
  if (record.expiresAt < new Date()) {
    res.status(401);
    throw new Error("SSO token has expired. Please log in again.");
  }

  // ── isActive check removed — DB mein default false tha ──
  let user = await User.findOne({ email: record.email });
  if (!user) {
    res.status(401);
    throw new Error("Pharmacist not found in IMS. Ask admin to add you first.");
  }

  // ── Stamp clinicId onto IMS user if missing ──
  if (record.clinicId && !user.clinicId) {
    user.clinicId = String(record.clinicId);
    await user.save();
  }

  const imsToken = signToken(user._id, user.clinicId);
  res.json({
    token: imsToken,
    user: {
      id:          user._id,
      fullName:    user.fullName,
      email:       user.email,
      role:        user.role,
      permissions: user.permissions,
      clinicId:    user.clinicId,
    },
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});