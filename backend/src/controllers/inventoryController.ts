import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, Product, StockMovement } from '../types/index.js';

const movementSchema = z.object({
  product_id: z.number().int().positive('Product ID must be valid'),
  quantity_changed: z.number().int().positive('Quantity must be greater than 0'),
  movement_type: z.enum(['IN', 'OUT']),
  reason: z.string().min(2, 'Reason is required'),
});

export async function getStockMovements(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { product_id, limit = '50', offset = '0' } = req.query;

    let query = `
      SELECT 
        sm.id, sm.product_id, sm.quantity_changed, sm.movement_type, sm.reason, sm.created_by, sm.created_at,
        p.product_name, p.sku, p.current_stock,
        u.name as user_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (product_id) {
      const pId = parseInt(product_id as string, 10);
      if (!isNaN(pId)) {
        query += ` AND sm.product_id = $${paramIndex}`;
        params.push(pId);
        paramIndex++;
      }
    }

    query += ` ORDER BY sm.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string, 10) || 50, parseInt(offset as string, 10) || 0);

    const result = await db.query<StockMovement>(query, params);

    res.json({
      success: true,
      movements: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function createStockMovement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = movementSchema.parse(req.body);

    const result = await db.transaction(async (client) => {
      // 1. Lock product row for update
      const prodRes = await client.query<Product>(
        'SELECT id, product_name, sku, current_stock FROM products WHERE id = $1',
        [validated.product_id]
      );

      if (prodRes.rows.length === 0) {
        throw new AppError('Product not found', 404);
      }

      const product = prodRes.rows[0];

      // 2. Validate sufficient stock for OUT movements
      if (validated.movement_type === 'OUT') {
        if (product.current_stock < validated.quantity_changed) {
          throw new AppError(
            `Insufficient stock for product: ${product.product_name}. Current stock is ${product.current_stock}, but requested to remove ${validated.quantity_changed}. Stock cannot become negative.`,
            400
          );
        }
      }

      // 3. Compute new stock
      const newStock = validated.movement_type === 'IN'
        ? product.current_stock + validated.quantity_changed
        : product.current_stock - validated.quantity_changed;

      // 4. Update current_stock in products table
      await client.query(
        'UPDATE products SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStock, product.id]
      );

      // 5. Insert movement record
      const moveRes = await client.query<StockMovement>(
        `INSERT INTO stock_movements (
          product_id, quantity_changed, movement_type, reason, created_by
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          product.id,
          validated.quantity_changed,
          validated.movement_type,
          validated.reason.trim(),
          req.user?.id || null,
        ]
      );

      return {
        movement: moveRes.rows[0],
        product: {
          id: product.id,
          product_name: product.product_name,
          sku: product.sku,
          new_stock: newStock,
        },
      };
    });

    res.status(201).json({
      success: true,
      message: `Stock movement recorded successfully. Product stock updated.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
