import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, Customer } from '../types/index.js';

const customerSchema = z.object({
  customer_name: z.string().min(2, 'Customer name must be at least 2 characters'),
  mobile: z.string().min(8, 'Mobile number must be at least 8 characters'),
  email: z.string().email('Invalid email address'),
  business_name: z.string().min(2, 'Business name must be at least 2 characters'),
  gst_number: z.string().optional().nullable(),
  customer_type: z.enum(['Retail', 'Wholesale', 'Distributor']),
  address: z.string().min(3, 'Address must be at least 3 characters'),
  status: z.enum(['Lead', 'Active', 'Inactive']).default('Active'),
  follow_up_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function getCustomers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, status, type, page = '1', limit = '10' } = req.query;

    let query = 'SELECT * FROM customers WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (customer_name ILIKE $${paramIndex} OR mobile ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR business_name ILIKE $${paramIndex})`;
      params.push(term);
      paramIndex++;
    }

    if (status && typeof status === 'string' && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type && typeof type === 'string' && type !== 'all') {
      query += ` AND customer_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    // Count total before pagination
    const countQuery = query.replace('SELECT * FROM customers', 'SELECT COUNT(*) as count FROM customers');
    const countRes = await db.query(countQuery, params);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    query += ' ORDER BY id DESC';

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const result = await db.query<Customer>(query, params);

    res.json({
      success: true,
      customers: result.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      throw new AppError('Invalid customer ID', 400);
    }

    const customerRes = await db.query<Customer>('SELECT * FROM customers WHERE id = $1', [id]);
    if (customerRes.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    // Fetch customer challans
    const challansRes = await db.query(
      `SELECT c.id, c.challan_number, c.total_quantity, c.total_amount, c.status, c.created_at
       FROM challans c
       WHERE c.customer_id = $1
       ORDER BY c.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      customer: customerRes.rows[0],
      challans: challansRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function createCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = customerSchema.parse(req.body);

    const result = await db.query<Customer>(
      `INSERT INTO customers (
        customer_name, mobile, email, business_name, gst_number,
        customer_type, address, status, follow_up_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        validated.customer_name.trim(),
        validated.mobile.trim(),
        validated.email.trim().toLowerCase(),
        validated.business_name.trim(),
        validated.gst_number?.trim() || null,
        validated.customer_type,
        validated.address.trim(),
        validated.status,
        validated.follow_up_date || null,
        validated.notes?.trim() || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      throw new AppError('Invalid customer ID', 400);
    }

    const validated = customerSchema.parse(req.body);

    const checkRes = await db.query('SELECT id FROM customers WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    const result = await db.query<Customer>(
      `UPDATE customers SET
        customer_name = $1,
        mobile = $2,
        email = $3,
        business_name = $4,
        gst_number = $5,
        customer_type = $6,
        address = $7,
        status = $8,
        follow_up_date = $9,
        notes = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *`,
      [
        validated.customer_name.trim(),
        validated.mobile.trim(),
        validated.email.trim().toLowerCase(),
        validated.business_name.trim(),
        validated.gst_number?.trim() || null,
        validated.customer_type,
        validated.address.trim(),
        validated.status,
        validated.follow_up_date || null,
        validated.notes?.trim() || null,
        id,
      ]
    );

    res.json({
      success: true,
      message: 'Customer updated successfully',
      customer: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      throw new AppError('Invalid customer ID', 400);
    }

    // Check if customer has challans
    const challanCheck = await db.query('SELECT COUNT(*) as count FROM challans WHERE customer_id = $1', [id]);
    if (parseInt(challanCheck.rows[0]?.count || '0', 10) > 0) {
      throw new AppError('Cannot delete customer with existing sales challans. Consider marking customer as Inactive instead.', 400);
    }

    const result = await db.query('DELETE FROM customers WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}
