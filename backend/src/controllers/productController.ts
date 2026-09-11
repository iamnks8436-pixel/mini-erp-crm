import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, Product } from '../types/index.js';

const productSchema = z.object({
  product_name: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().min(2, 'SKU must be at least 2 characters').toUpperCase(),
  category: z.string().min(2, 'Category must be at least 2 characters'),
  unit_price: z.number().min(0.01, 'Unit price must be greater than 0'),
  current_stock: z.number().int().min(0, 'Current stock cannot be negative').default(0),
  minimum_stock: z.number().int().min(0, 'Minimum stock cannot be negative').default(10),
  warehouse_location: z.string().min(1, 'Warehouse location is required'),
});

export async function getProducts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, category, stockStatus } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (product_name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
      params.push(term);
      paramIndex++;
    }

    if (category && typeof category === 'string' && category !== 'all') {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (stockStatus === 'low') {
      query += ` AND current_stock <= minimum_stock`;
    } else if (stockStatus === 'out_of_stock') {
      query += ` AND current_stock = 0`;
    } else if (stockStatus === 'in_stock') {
      query += ` AND current_stock > 0`;
    }

    query += ' ORDER BY product_name ASC';

    const result = await db.query<Product>(query, params);

    // Get list of distinct categories for filters
    const catRes = await db.query('SELECT DISTINCT category FROM products ORDER BY category ASC');
    const categories = catRes.rows.map(r => r.category);

    res.json({
      success: true,
      products: result.rows,
      categories,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      throw new AppError('Invalid product ID', 400);
    }

    const result = await db.query<Product>('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    // Get latest movements for this product
    const movementsRes = await db.query(
      `SELECT sm.*, u.name as user_name
       FROM stock_movements sm
       LEFT JOIN users u ON sm.created_by = u.id
       WHERE sm.product_id = $1
       ORDER BY sm.created_at DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      success: true,
      product: result.rows[0],
      recentMovements: movementsRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = productSchema.parse(req.body);

    // Check SKU duplicate
    const skuCheck = await db.query('SELECT id FROM products WHERE LOWER(sku) = LOWER($1)', [validated.sku.trim()]);
    if (skuCheck.rows.length > 0) {
      throw new AppError(`A product with SKU "${validated.sku.trim()}" already exists`, 409);
    }

    // Insert product and record initial stock movement if current_stock > 0
    const result = await db.transaction(async (client) => {
      const prodRes = await client.query<Product>(
        `INSERT INTO products (
          product_name, sku, category, unit_price, current_stock, minimum_stock, warehouse_location
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          validated.product_name.trim(),
          validated.sku.trim().toUpperCase(),
          validated.category.trim(),
          validated.unit_price,
          validated.current_stock,
          validated.minimum_stock,
          validated.warehouse_location.trim(),
        ]
      );

      const product = prodRes.rows[0];

      if (validated.current_stock > 0) {
        await client.query(
          `INSERT INTO stock_movements (
            product_id, quantity_changed, movement_type, reason, created_by
          ) VALUES ($1, $2, 'IN', 'Initial Stock Onboarding', $3)`,
          [product.id, validated.current_stock, req.user?.id || null]
        );
      }

      return product;
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      throw new AppError('Invalid product ID', 400);
    }

    const updateSchema = productSchema.omit({ current_stock: true });
    const validated = updateSchema.parse(req.body);

    // Check SKU uniqueness
    const skuCheck = await db.query(
      'SELECT id FROM products WHERE LOWER(sku) = LOWER($1) AND id != $2',
      [validated.sku.trim(), id]
    );
    if (skuCheck.rows.length > 0) {
      throw new AppError(`A product with SKU "${validated.sku.trim()}" already exists`, 409);
    }

    const result = await db.query<Product>(
      `UPDATE products SET
        product_name = $1,
        sku = $2,
        category = $3,
        unit_price = $4,
        minimum_stock = $5,
        warehouse_location = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *`,
      [
        validated.product_name.trim(),
        validated.sku.trim().toUpperCase(),
        validated.category.trim(),
        validated.unit_price,
        validated.minimum_stock,
        validated.warehouse_location.trim(),
        id,
      ]
    );

    if (result.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      throw new AppError('Invalid product ID', 400);
    }

    // Check references
    const challanItemCheck = await db.query('SELECT COUNT(*) as count FROM challan_items WHERE product_id = $1', [id]);
    if (parseInt(challanItemCheck.rows[0]?.count || '0', 10) > 0) {
      throw new AppError('Cannot delete product because it has associated sales challan records.', 400);
    }

    const movementCheck = await db.query('SELECT COUNT(*) as count FROM stock_movements WHERE product_id = $1', [id]);
    if (parseInt(movementCheck.rows[0]?.count || '0', 10) > 1) {
      throw new AppError('Cannot delete product with multiple audit stock movements.', 400);
    }

    await db.transaction(async (client) => {
      await client.query('DELETE FROM stock_movements WHERE product_id = $1', [id]);
      await client.query('DELETE FROM products WHERE id = $1', [id]);
    });

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}
