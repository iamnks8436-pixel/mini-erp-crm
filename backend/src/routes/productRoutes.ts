import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Viewing allowed for all authenticated roles (needed for selecting products in challans, catalog viewing)
router.get('/', authenticateToken, getProducts);
router.get('/:id', authenticateToken, getProductById);

// Modification strictly restricted to Admin and Warehouse
router.post('/', authenticateToken, requireRole(['Admin', 'Warehouse']), createProduct);
router.put('/:id', authenticateToken, requireRole(['Admin', 'Warehouse']), updateProduct);
router.delete('/:id', authenticateToken, requireRole(['Admin', 'Warehouse']), deleteProduct);

export default router;
