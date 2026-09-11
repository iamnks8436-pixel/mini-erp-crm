import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, Challan, ChallanItem, Product } from '../types/index.js';

const challanItemInputSchema = z.object({
  product_id: z.number().int().positive('Valid product ID required'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
});

const createChallanSchema = z.object({
  customer_id: z.number().int().positive('Valid customer ID required'),
  notes: z.string().optional().nullable(),
  status: z.enum(['Draft', 'Confirmed']).default('Draft'),
  items: z.array(challanItemInputSchema).min(1, 'At least one product item is required in a challan'),
});

// Helper to generate unique challan number: CH-YYYYMMDD-XXXX
async function generateChallanNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countRes = await db.query('SELECT COUNT(*) as count FROM challans');
  const count = parseInt(countRes.rows[0]?.count || '0', 10) + 1;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CH-${dateStr}-${count.toString().padStart(3, '0')}-${randomSuffix}`;
}

export async function getChallans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, search, customer_id, page = '1', limit = '10' } = req.query;

    let query = `
      SELECT 
        c.id, c.challan_number, c.customer_id, c.total_quantity, c.total_amount, c.status, c.notes, c.created_at, c.updated_at,
        cust.customer_name, cust.business_name,
        u.name as user_name,
        COUNT(ci.id) as item_count
      FROM challans c
      JOIN customers cust ON c.customer_id = cust.id
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN challan_items ci ON c.id = ci.challan_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status && typeof status === 'string' && status !== 'all') {
      query += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (customer_id) {
      const cId = parseInt(customer_id as string, 10);
      if (!isNaN(cId)) {
        query += ` AND c.customer_id = $${paramIndex}`;
        params.push(cId);
        paramIndex++;
      }
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (c.challan_number ILIKE $${paramIndex} OR cust.customer_name ILIKE $${paramIndex} OR cust.business_name ILIKE $${paramIndex})`;
      params.push(term);
      paramIndex++;
    }

    query += ` GROUP BY c.id, cust.customer_name, cust.business_name, u.name ORDER BY c.created_at DESC`;

    const countRes = await db.query(`SELECT COUNT(*) as count FROM (${query}) as count_sub`, params);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const result = await db.query(query, params);

    res.json({
      success: true,
      challans: result.rows,
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

export async function getChallanById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      throw new AppError('Invalid challan ID', 400);
    }

    const challanRes = await db.query(
      `SELECT 
        c.id, c.challan_number, c.customer_id, c.total_quantity, c.total_amount, c.status, c.notes, c.created_at, c.updated_at,
        cust.customer_name, cust.business_name, cust.email as customer_email, cust.mobile as customer_mobile, cust.address as customer_address, cust.gst_number as customer_gst,
        u.name as user_name
      FROM challans c
      JOIN customers cust ON c.customer_id = cust.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = $1`,
      [id]
    );

    if (challanRes.rows.length === 0) {
      throw new AppError('Challan not found', 404);
    }

    const itemsRes = await db.query<ChallanItem>(
      `SELECT ci.*, p.current_stock as live_stock
       FROM challan_items ci
       LEFT JOIN products p ON ci.product_id = p.id
       WHERE ci.challan_id = $1
       ORDER BY ci.id ASC`,
      [id]
    );

    const challan = challanRes.rows[0];
    challan.items = itemsRes.rows;

    res.json({
      success: true,
      challan,
    });
  } catch (err) {
    next(err);
  }
}

export async function createChallan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createChallanSchema.parse(req.body);

    // Validate customer exists
    const custRes = await db.query('SELECT id, customer_name FROM customers WHERE id = $1', [validated.customer_id]);
    if (custRes.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    const challanNumber = await generateChallanNumber();

    // Fetch product details for snapshots
    const productIds = validated.items.map(item => item.product_id);
    const prodRes = await db.query<Product>(
      'SELECT id, product_name, sku, unit_price, current_stock FROM products WHERE id = ANY($1)',
      [productIds]
    );

    const productMap = new Map<number, Product>();
    prodRes.rows.forEach(p => productMap.set(p.id, p));

    // Verify all products exist
    for (const item of validated.items) {
      if (!productMap.has(item.product_id)) {
        throw new AppError(`Product with ID ${item.product_id} not found`, 404);
      }
    }

    // Calculate totals and prepare snapshot rows
    let totalQuantity = 0;
    let totalAmount = 0;
    const itemSnapshots = validated.items.map(item => {
      const p = productMap.get(item.product_id)!;
      const unitPrice = Number(p.unit_price);
      const totalPrice = Number((unitPrice * item.quantity).toFixed(2));
      totalQuantity += item.quantity;
      totalAmount += totalPrice;

      return {
        product_id: p.id,
        product_name_snapshot: p.product_name,
        sku_snapshot: p.sku,
        unit_price_snapshot: unitPrice,
        quantity: item.quantity,
        total_price: totalPrice,
      };
    });

    const isDirectConfirm = validated.status === 'Confirmed';

    // Execute within database transaction
    const newChallan = await db.transaction(async (client) => {
      // If directly confirming, verify stock first
      if (isDirectConfirm) {
        for (const item of validated.items) {
          const p = productMap.get(item.product_id)!;
          // Query latest stock with lock
          const liveProd = await client.query<Product>(
            'SELECT id, product_name, current_stock FROM products WHERE id = $1',
            [item.product_id]
          );
          const currentStock = liveProd.rows[0]?.current_stock ?? 0;
          if (currentStock < item.quantity) {
            throw new AppError(
              `Insufficient stock for product: ${liveProd.rows[0]?.product_name || p.product_name} (Available: ${currentStock}, Required: ${item.quantity})`,
              400
            );
          }
        }
      }

      // Insert challan record
      const initialStatus = isDirectConfirm ? 'Confirmed' : 'Draft';
      const challanInsertRes = await client.query<Challan>(
        `INSERT INTO challans (
          challan_number, customer_id, total_quantity, total_amount, status, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          challanNumber,
          validated.customer_id,
          totalQuantity,
          Number(totalAmount.toFixed(2)),
          initialStatus,
          validated.notes?.trim() || null,
          req.user?.id || null,
        ]
      );

      const createdChallan = challanInsertRes.rows[0];

      // Insert snapshot items
      const createdItems: ChallanItem[] = [];
      for (const snap of itemSnapshots) {
        const itemRes = await client.query<ChallanItem>(
          `INSERT INTO challan_items (
            challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity, total_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            createdChallan.id,
            snap.product_id,
            snap.product_name_snapshot,
            snap.sku_snapshot,
            snap.unit_price_snapshot,
            snap.quantity,
            snap.total_price,
          ]
        );
        createdItems.push(itemRes.rows[0]);

        // If directly confirmed: reduce stock and record OUT stock movement
        if (isDirectConfirm) {
          await client.query(
            'UPDATE products SET current_stock = current_stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [snap.quantity, snap.product_id]
          );

          await client.query(
            `INSERT INTO stock_movements (
              product_id, quantity_changed, movement_type, reason, created_by
            ) VALUES ($1, $2, 'OUT', $3, $4)`,
            [
              snap.product_id,
              snap.quantity,
              `Sales Challan Confirmed #${challanNumber}`,
              req.user?.id || null,
            ]
          );
        }
      }

      createdChallan.items = createdItems;
      return createdChallan;
    });

    res.status(201).json({
      success: true,
      message: isDirectConfirm ? 'Challan created and confirmed successfully' : 'Draft challan created successfully',
      challan: newChallan,
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmChallan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      throw new AppError('Invalid challan ID', 400);
    }

    // Execute atomic confirmation transaction
    const result = await db.transaction(async (client) => {
      // 1. Fetch challan
      const challanRes = await client.query<Challan>(
        'SELECT * FROM challans WHERE id = $1',
        [id]
      );

      if (challanRes.rows.length === 0) {
        throw new AppError('Challan not found', 404);
      }

      const challan = challanRes.rows[0];

      // 2. Validate current status
      if (challan.status === 'Confirmed') {
        throw new AppError('Challan is already confirmed and cannot be confirmed again.', 400);
      }

      if (challan.status === 'Cancelled') {
        throw new AppError('Cannot confirm a cancelled challan.', 400);
      }

      // 3. Fetch all challan items
      const itemsRes = await client.query<ChallanItem>(
        'SELECT * FROM challan_items WHERE challan_id = $1',
        [id]
      );

      if (itemsRes.rows.length === 0) {
        throw new AppError('Cannot confirm a challan with no line items.', 400);
      }

      const items = itemsRes.rows;

      // 4. Verify stock sufficiency for EVERY product before any deductions
      for (const item of items) {
        const prodRes = await client.query<Product>(
          'SELECT id, product_name, sku, current_stock FROM products WHERE id = $1',
          [item.product_id]
        );

        if (prodRes.rows.length === 0) {
          throw new AppError(`Product ${item.product_name_snapshot} no longer exists in database`, 404);
        }

        const product = prodRes.rows[0];

        if (product.current_stock < item.quantity) {
          // Reject immediately with exact requested format
          throw new AppError(
            `Insufficient stock for product: ${product.product_name} (Available: ${product.current_stock}, Required: ${item.quantity})`,
            400
          );
        }
      }

      // 5. If all items have sufficient stock: deduct stock and insert OUT stock movements
      for (const item of items) {
        // Deduct current_stock
        await client.query(
          'UPDATE products SET current_stock = current_stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.quantity, item.product_id]
        );

        // Record stock movement OUT
        await client.query(
          `INSERT INTO stock_movements (
            product_id, quantity_changed, movement_type, reason, created_by
          ) VALUES ($1, $2, 'OUT', $3, $4)`,
          [
            item.product_id,
            item.quantity,
            `Sales Challan Confirmed #${challan.challan_number}`,
            req.user?.id || null,
          ]
        );
      }

      // 6. Update challan status to Confirmed
      const updatedChallanRes = await client.query<Challan>(
        `UPDATE challans SET
          status = 'Confirmed',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *`,
        [id]
      );

      return updatedChallanRes.rows[0];
    });

    res.json({
      success: true,
      message: `Challan #${result.challan_number} confirmed successfully. Inventory has been updated.`,
      challan: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelChallan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      throw new AppError('Invalid challan ID', 400);
    }

    const challanRes = await db.query<Challan>('SELECT * FROM challans WHERE id = $1', [id]);
    if (challanRes.rows.length === 0) {
      throw new AppError('Challan not found', 404);
    }

    const challan = challanRes.rows[0];

    if (challan.status === 'Cancelled') {
      throw new AppError('Challan is already cancelled.', 400);
    }

    if (challan.status === 'Confirmed') {
      throw new AppError('A confirmed challan cannot be cancelled directly to maintain audit trail and inventory integrity.', 400);
    }

    // Only Draft challans can be cancelled
    const updated = await db.query<Challan>(
      `UPDATE challans SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    res.json({
      success: true,
      message: `Challan #${challan.challan_number} has been cancelled.`,
      challan: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

const updateChallanSchema = z.object({
  customer_id: z.number().int().positive('Valid customer ID required').optional(),
  notes: z.string().optional().nullable(),
  items: z.array(challanItemInputSchema).min(1, 'At least one product item is required').optional(),
});

export async function updateChallan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      throw new AppError('Invalid challan ID', 400);
    }

    const validated = updateChallanSchema.parse(req.body);

    const result = await db.transaction(async (client) => {
      // 1. Fetch challan
      const challanRes = await client.query<Challan>('SELECT * FROM challans WHERE id = $1', [id]);
      if (challanRes.rows.length === 0) {
        throw new AppError('Challan not found', 404);
      }

      const challan = challanRes.rows[0];

      if (challan.status !== 'Draft') {
        throw new AppError(`Cannot edit challan in '${challan.status}' status. Only Draft challans can be modified.`, 400);
      }

      let customerId = challan.customer_id;
      if (validated.customer_id) {
        const custRes = await client.query('SELECT id FROM customers WHERE id = $1', [validated.customer_id]);
        if (custRes.rows.length === 0) {
          throw new AppError('Customer not found', 404);
        }
        customerId = validated.customer_id;
      }

      let totalQuantity = challan.total_quantity;
      let totalAmount = challan.total_amount;
      const notes = validated.notes !== undefined ? (validated.notes?.trim() || null) : challan.notes;

      if (validated.items && validated.items.length > 0) {
        const productIds = validated.items.map(i => i.product_id);
        const prodRes = await client.query<Product>(
          'SELECT id, product_name, sku, unit_price FROM products WHERE id = ANY($1)',
          [productIds]
        );

        const productMap = new Map<number, Product>();
        prodRes.rows.forEach(p => productMap.set(p.id, p));

        for (const item of validated.items) {
          if (!productMap.has(item.product_id)) {
            throw new AppError(`Product with ID ${item.product_id} not found`, 404);
          }
        }

        // Delete existing items
        await client.query('DELETE FROM challan_items WHERE challan_id = $1', [id]);

        totalQuantity = 0;
        totalAmount = 0;
        const insertedItems: ChallanItem[] = [];

        for (const item of validated.items) {
          const p = productMap.get(item.product_id)!;
          const unitPrice = Number(p.unit_price);
          const totalPrice = Number((unitPrice * item.quantity).toFixed(2));
          totalQuantity += item.quantity;
          totalAmount += totalPrice;

          const itemRes = await client.query<ChallanItem>(
            `INSERT INTO challan_items (
              challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity, total_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [id, p.id, p.product_name, p.sku, unitPrice, item.quantity, totalPrice]
          );
          insertedItems.push(itemRes.rows[0]);
        }
      }

      const updatedChallanRes = await client.query<Challan>(
        `UPDATE challans SET
          customer_id = $1,
          total_quantity = $2,
          total_amount = $3,
          notes = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *`,
        [customerId, totalQuantity, Number(totalAmount.toFixed(2)), notes, id]
      );

      const updatedChallan = updatedChallanRes.rows[0];
      const itemsRes = await client.query<ChallanItem>(
        'SELECT * FROM challan_items WHERE challan_id = $1 ORDER BY id ASC',
        [id]
      );
      updatedChallan.items = itemsRes.rows;

      return updatedChallan;
    });

    res.json({
      success: true,
      message: 'Draft challan updated successfully',
      challan: result,
    });
  } catch (err) {
    next(err);
  }
}

