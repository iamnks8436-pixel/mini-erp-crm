import { Response, NextFunction } from 'express';
import { db } from '../config/db.js';
import { AuthenticatedRequest } from '../types/index.js';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Total Customers
    const custCountRes = await db.query('SELECT COUNT(*) as count FROM customers');
    const totalCustomers = parseInt(custCountRes.rows[0]?.count || '0', 10);

    // 2. Products and Low Stock
    const prodStatsRes = await db.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN current_stock <= minimum_stock THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN current_stock = 0 THEN 1 END) as out_of_stock_count
      FROM products
    `);
    const totalProducts = parseInt(prodStatsRes.rows[0]?.total_products || '0', 10);
    const lowStockCount = parseInt(prodStatsRes.rows[0]?.low_stock_count || '0', 10);
    const outOfStockCount = parseInt(prodStatsRes.rows[0]?.out_of_stock_count || '0', 10);

    // 3. Challans Stats
    const challanStatsRes = await db.query(`
      SELECT 
        COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN status = 'Confirmed' THEN 1 END) as confirmed_count,
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled_count,
        COALESCE(SUM(CASE WHEN status = 'Confirmed' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'Confirmed' THEN total_quantity ELSE 0 END), 0) as total_items_sold
      FROM challans
    `);
    const draftChallans = parseInt(challanStatsRes.rows[0]?.draft_count || '0', 10);
    const confirmedChallans = parseInt(challanStatsRes.rows[0]?.confirmed_count || '0', 10);
    const cancelledChallans = parseInt(challanStatsRes.rows[0]?.cancelled_count || '0', 10);
    const totalRevenue = parseFloat(challanStatsRes.rows[0]?.total_revenue || '0');
    const totalItemsSold = parseInt(challanStatsRes.rows[0]?.total_items_sold || '0', 10);

    // 4. Prominent Low Stock Products
    const lowStockProductsRes = await db.query(`
      SELECT id, product_name, sku, category, unit_price, current_stock, minimum_stock, warehouse_location
      FROM products
      WHERE current_stock <= minimum_stock
      ORDER BY current_stock ASC
      LIMIT 8
    `);

    // 5. Recent Customers
    const recentCustomersRes = await db.query(`
      SELECT id, customer_name, business_name, email, mobile, customer_type, status, created_at
      FROM customers
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // 6. Recent Stock Movements
    const recentMovementsRes = await db.query(`
      SELECT sm.id, sm.product_id, sm.quantity_changed, sm.movement_type, sm.reason, sm.created_at,
             p.product_name, p.sku, u.name as user_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.created_by = u.id
      ORDER BY sm.created_at DESC
      LIMIT 5
    `);

    // 7. Recent Challans
    const recentChallansRes = await db.query(`
      SELECT c.id, c.challan_number, c.total_quantity, c.total_amount, c.status, c.created_at,
             cust.customer_name, cust.business_name, u.name as user_name
      FROM challans c
      JOIN customers cust ON c.customer_id = cust.id
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      stats: {
        totalCustomers,
        totalProducts,
        lowStockCount,
        outOfStockCount,
        draftChallans,
        confirmedChallans,
        cancelledChallans,
        totalRevenue,
        totalItemsSold,
        lowStockProducts: lowStockProductsRes.rows,
        recentCustomers: recentCustomersRes.rows,
        recentMovements: recentMovementsRes.rows,
        recentChallans: recentChallansRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}
