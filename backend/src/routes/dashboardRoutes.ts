import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Dashboard stats available to all authenticated roles
router.get('/stats', authenticateToken, getDashboardStats);

export default router;
