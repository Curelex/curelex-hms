import { ROLES } from "../utils/permissions.js";

export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: "Forbidden: role not allowed"
    });
  }

  return next();
};

export const authorizePermissions =
  (...permissions) => (req, res, next) => {

    // Admin bypass
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    const granted = req.user.permissions || [];

    const hasAll = permissions.every((permission) =>
      granted.includes(permission)
    );

    if (!hasAll) {
      return res.status(403).json({
        message: "Forbidden: permission denied"
      });
    }

    return next();
  };