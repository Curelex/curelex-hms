import express from 'express';
import { listPurchases, createPurchase, updatePurchaseStatus } from "../controllers/purchaseController.js";
import { protect } from "../middleware/authMiddleware.js";
import validateRequest from "../middleware/validateRequest.js";
import { purchaseValidator } from "../middleware/validators.js";
import { authorizePermissions } from "../middleware/authorize.js"; // ← changed

const router = express.Router();

router.use(protect); // ← removed authorizeRoles(ROLES.ADMIN)

router.get("/", authorizePermissions("purchases.read"), listPurchases);
router.post("/", authorizePermissions("purchases.write"), purchaseValidator, validateRequest, createPurchase);

export default router;