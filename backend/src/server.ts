import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import productRoutes from './routes/productRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import challanRoutes from './routes/challanRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

import { errorHandler } from './middleware/errorHandler.js';
import { runMigrations } from './config/db.js';
import { seedDatabase } from './db/seed.js';

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Mini ERP + CRM Operations Portal API',
    timestamp: new Date().toISOString(),
  });
});

// --------------------------------------------------
// API routes
// --------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock-movements', inventoryRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/dashboard', dashboardRoutes);

// --------------------------------------------------
// 404 handler
// --------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// --------------------------------------------------
// Error handler
// --------------------------------------------------

app.use(errorHandler);

// --------------------------------------------------
// Start server
// --------------------------------------------------

async function startServer() {
  try {
    console.log('[Server] Initializing database and running migrations...');

    await runMigrations();

    console.log('[Server] Initializing seed data if needed...');

    await seedDatabase();

    const server = app.listen(PORT, HOST, () => {
      console.log('===================================================');
      console.log('  Mini ERP + CRM Operations Portal API');
      console.log(`  Server running on ${HOST}:${PORT}`);
      console.log(`  Health Check: /api/health`);
      console.log('===================================================');
    });

    server.on('error', (error) => {
      console.error('[Server] HTTP server error:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('[Server] Fatal startup error:', error);
    process.exit(1);
  }
}

// --------------------------------------------------
// Start only when not running tests
// --------------------------------------------------

if (
  process.env.NODE_ENV !== 'test' &&
  !process.argv[1]?.includes('test')
) {
  startServer();
}

export default app;