import express from "express";
import {
  listProducts, createProduct, updateProduct,
  deleteProduct, getProductQr, getProductBarcode,
  uploadProductImage
} from "../controllers/productController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizePermissions } from "../middleware/authorize.js";  // ← changed

const router = express.Router();

router.use(protect);

router.get("/", listProducts);
router.get("/:id/qr", getProductQr);
router.get("/:id/barcode", getProductBarcode);

router.post("/", authorizePermissions("products.write"), uploadProductImage, createProduct);   // ← changed
router.put("/:id", authorizePermissions("products.write"), uploadProductImage, updateProduct); // ← changed
router.delete("/:id", authorizePermissions("products.write"), deleteProduct);                  // ← changed

export default router;