import express from 'express';

import authRoutes from "./authRoutes.js";
import productRoutes from "./productRoutes.js";
import inventoryRoutes from "./inventoryRoutes.js";
import salesRoutes from "./salesRoutes.js";
import purchaseRoutes from "./purchaseRoutes.js";
import customerRoutes from "./customerRoutes.js";
import supplierRoutes from "./supplierRoutes.js";
import reportRoutes from "./reportRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/sales", salesRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/customers", customerRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/reports", reportRoutes);

export default router;