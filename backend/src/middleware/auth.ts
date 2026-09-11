import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, AuthUser, UserRole } from '../types/index.js';

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.',
    });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET || 'mini_erp_crm_super_secure_jwt_secret_token_2026_key!';

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
    return;
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized. User context missing.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource. Required roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
}
