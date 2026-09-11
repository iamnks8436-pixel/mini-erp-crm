import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, User } from '../types/index.js';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await db.query<User>(
      'SELECT id, name, email, password_hash, role, created_at FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid email or password', 401);
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const jwtSecret = process.env.JWT_SECRET || 'mini_erp_crm_super_secure_jwt_secret_token_2026_key!';
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    const result = await db.query<User>(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}
