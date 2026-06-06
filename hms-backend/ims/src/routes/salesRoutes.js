import express from 'express';
import jwt from "jsonwebtoken";
import {
  listSales,
  createSaleTransaction,
  finalizeSaleTransaction,
  cancelDraftSale,
  downloadInvoicePdf
} from "../controllers/salesController.js";
import { protect } from "../middleware/authMiddleware.js";
import validateRequest from "../middleware/validateRequest.js";
import { saleValidator } from "../middleware/validators.js";
import { authorizePermissions } from "../middleware/authorize.js";
import env from "../config/env.js";

const router = express.Router();

// ✅ Reusable middleware — supports Bearer token AND ?token= query param
const protectOrQueryToken = (req, res, next) => {
  if (req.headers.authorization) {
    return protect(req, res, next);
  }
  if (req.query.token) {
    try {
      const decoded = jwt.verify(req.query.token, env.jwtSecret);
      req.user = {
        _id:      decoded.id,
        clinicId: decoded.clinicId, // ✅ clinicId must be here
      };
      return next();
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }
  return res.status(401).json({ message: "Unauthorized" });
};

// ✅ FIXED — now has proper auth with clinicId
router.get("/:id/invoice.pdf", protectOrQueryToken, downloadInvoicePdf);

router.use(protect);
router.get("/",              authorizePermissions("sales.read"),   listSales);
router.post("/",             authorizePermissions("sales.create"), saleValidator, validateRequest, createSaleTransaction);
router.post("/:id/finalize", authorizePermissions("sales.create"), finalizeSaleTransaction);
router.post("/:id/cancel",   authorizePermissions("sales.create"), cancelDraftSale);

export default router;