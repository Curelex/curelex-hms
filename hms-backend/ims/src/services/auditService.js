import AuditLog from "../models/AuditLog.js";

export const logAudit = async ({ action, entityType, entityId, metadata, actor }) => {
  await AuditLog.create({ action, entityType, entityId, metadata, actor });
};

export const getAuditLogs = async ({ page = 1, limit = 20, entityType, action } = {}) => {
  const filter = {};
  if (entityType) filter.entityType = entityType;
  if (action) filter.action = action;

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("actor", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    AuditLog.countDocuments(filter)
  ]);

  return { logs, total, page: Number(page), limit: Number(limit) };
};

