import { Router } from 'express';
import {
  getChallans,
  getChallanById,
  createChallan,
  updateChallan,
  confirmChallan,
  cancelChallan,
} from '../controllers/challanController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Viewing allowed for all roles (Admin, Sales, Accounts for invoicing, Warehouse for fulfillment status)
router.get('/', authenticateToken, requireRole(['Admin', 'Sales', 'Accounts', 'Warehouse']), getChallans);
router.get('/:id', authenticateToken, requireRole(['Admin', 'Sales', 'Accounts', 'Warehouse']), getChallanById);

// Creation, update, confirmation, cancellation strictly restricted to Admin and Sales
router.post('/', authenticateToken, requireRole(['Admin', 'Sales']), createChallan);
router.put('/:id', authenticateToken, requireRole(['Admin', 'Sales']), updateChallan);
router.post('/:id/confirm', authenticateToken, requireRole(['Admin', 'Sales']), confirmChallan);
router.post('/:id/cancel', authenticateToken, requireRole(['Admin', 'Sales']), cancelChallan);

export default router;
