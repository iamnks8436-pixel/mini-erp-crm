import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customerController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Viewing allowed for Admin, Sales, Accounts
router.get('/', authenticateToken, requireRole(['Admin', 'Sales', 'Accounts']), getCustomers);
router.get('/:id', authenticateToken, requireRole(['Admin', 'Sales', 'Accounts']), getCustomerById);

// Modification allowed for Admin, Sales
router.post('/', authenticateToken, requireRole(['Admin', 'Sales']), createCustomer);
router.put('/:id', authenticateToken, requireRole(['Admin', 'Sales']), updateCustomer);
router.delete('/:id', authenticateToken, requireRole(['Admin', 'Sales']), deleteCustomer);

export default router;
