import { Router } from 'express';
import { getStockMovements, createStockMovement } from '../controllers/inventoryController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Viewing movements allowed for Admin, Warehouse, Accounts
router.get('/', authenticateToken, requireRole(['Admin', 'Warehouse', 'Accounts']), getStockMovements);

// Recording manual movements strictly restricted to Admin and Warehouse
router.post('/', authenticateToken, requireRole(['Admin', 'Warehouse']), createStockMovement);

export default router;
