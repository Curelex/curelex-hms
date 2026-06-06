import express from 'express';
import { listInventory, adjustInventory, lowStock } from "../controllers/inventoryController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizePermissions } from "../middleware/authorize.js"; // ← changed
import validateRequest from "../middleware/validateRequest.js";
import { inventoryAdjustValidator } from "../middleware/validators.js";

const router = express.Router();

router.use(protect);
router.get("/", listInventory);
router.get("/low-stock", lowStock);
router.post("/adjust", authorizePermissions("inventory.adjust"), inventoryAdjustValidator, validateRequest, adjustInventory); // ← changed

export default router;