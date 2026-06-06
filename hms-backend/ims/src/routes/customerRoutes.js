import express from 'express';
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  customerHistory
} from "../controllers/customerController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", listCustomers);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.get("/:id/history", customerHistory);

export default router;
