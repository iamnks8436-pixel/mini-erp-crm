# Mini ERP + CRM Operations Portal

A complete, production-ready full-stack web application designed for wholesale and distribution companies. It features **Customer Relationship Management (CRM)**, **Product Catalog & Inventory Tracking**, and **Sales Delivery Challans** with atomic stock deductions and role-based access control.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Architecture & System Design](#architecture--system-design)
5. [Folder Structure](#folder-structure)
6. [Demo Login Credentials](#demo-login-credentials)
7. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
8. [Critical Business Logic](#critical-business-logic)
9. [Database Setup & Schema](#database-setup--schema)
10. [Environment Variables](#environment-variables)
11. [Installation & Local Run Guide](#installation--local-run-guide)
12. [Running Automated Tests](#running-automated-tests)
13. [API Documentation](#api-documentation)
14. [Postman Collection](#postman-collection)
15. [Deployment Guide](#deployment-guide)
16. [Assumptions & Limitations](#assumptions--limitations)

---

## Project Overview

Wholesale and distribution companies manage high-volume customer orders, inventory allocations, and physical dispatches. This portal unifies:
1. **CRM Pipeline:** Lead capturing, active customer profiles, follow-up scheduling, and linked delivery challan histories.
2. **Catalog & Inventory:** Real-time stock counts across warehouse bins, minimum safety stock thresholds, and immutable stock movement ledgers (`IN` / `OUT`).
3. **Delivery Challans:** Multi-line order creation with automatic historical price/SKU snapshots, draft stages that don't reduce stock, and transactional confirmations that safely deduct inventory and generate audit logs.

---

## Key Features

- **JWT Authentication & Role Control:** Secure bcrypt-hashed passwords and role verification implemented both on frontend UI and enforced in backend Express middleware.
- **1-Click Demo Login:** Dedicated role-switch buttons on `/login` for instant testing as Admin, Sales, Warehouse, or Accounts.
- **Operations Dashboard:** Live KPI metric cards (Total Customers, Total Products, Low Stock Warnings, Draft vs Confirmed Challans, Fulfilled Revenue), low-stock replenishment table, and recent activity streams.
- **Customer CRM Module:** Filter by status (`Active`, `Lead`, `Inactive`) and type (`Wholesale`, `Distributor`, `Retail`). Full CRUD, follow-up date picker, notes editor, and linked delivery challan history.
- **Product & Inventory Module:** SKU directory, category filtering, safety stock threshold warnings, stock status filters (`In Stock`, `Low Stock`, `Out of Stock`), and manual stock adjustment modal with negative-inventory protection.
- **Sales Challans Module:** Dynamic line items, unit price and stock checks, draft creation, editable drafts, printable delivery note document view, and atomic transactional confirmation.
- **Zero-Setup Embedded Database:** Ships with persistent embedded PostgreSQL engine (`@electric-sql/pglite`) in `backend/.data/postgres`, or easily connects to an external PostgreSQL instance (Supabase, Neon, AWS RDS, local PG) via `DATABASE_URL`.

---

## Tech Stack

### Frontend
- **Framework:** React 19 + TypeScript + Vite 8
- **Routing:** React Router v7 (Protected Routes, Role Guards)
- **HTTP Client:** Axios (automatic JWT token injection and error interceptors)
- **Icons:** Lucide React
- **Styling:** Custom Business Design System (Vanilla CSS with CSS variables, responsive tables, modal dialogs, and print stylesheets)

### Backend
- **Runtime:** Node.js (ES Modules) + TypeScript
- **Server:** Express.js 5
- **Authentication:** JSON Web Tokens (`jsonwebtoken`) + Password Hashing (`bcryptjs`)
- **Validation:** Zod schemas
- **Database:** PostgreSQL (supports external PostgreSQL and embedded `@electric-sql/pglite`)

---

## Architecture & System Design

```
+-------------------------------------------------------------+
|                      React Frontend                         |
|  (Vite + React Router + AuthContext + Axios Interceptors)   |
+------------------------------+------------------------------+
                               |  REST API (/api/*)
                               |  Bearer JWT
+------------------------------v------------------------------+
|                     Express.js Backend                      |
|  - Auth Middleware (JWT Verification & Role Permissions)   |
|  - Zod Request Body Validation                             |
|  - Centralized Error Handling                              |
|  - Business Transaction Layer                              |
+------------------------------+------------------------------+
                               |
                               |  SQL Queries & Transactions
+------------------------------v------------------------------+
|                     PostgreSQL Database                     |
|  - users, customers, products, stock_movements             |
|  - challans, challan_items (Historical Snapshots)          |
+-------------------------------------------------------------+
```

---

## Folder Structure

```
mini-erp-crm/
├── backend/
│   ├── .data/postgres/         # Embedded persistent PostgreSQL database storage
│   ├── src/
│   │   ├── config/
│   │   │   └── db.ts           # PostgreSQL connection manager & migration runner
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── customerController.ts
│   │   │   ├── productController.ts
│   │   │   ├── inventoryController.ts
│   │   │   ├── challanController.ts
│   │   │   └── dashboardController.ts
│   │   ├── db/
│   │   │   ├── schema.sql      # Database schema definitions and indexes
│   │   │   └── seed.ts         # Realistic wholesale demo data seeder
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT authentication & requireRole middleware
│   │   │   └── errorHandler.ts # Centralized Zod, AppError & PG error handler
│   │   ├── routes/             # REST route registrations
│   │   ├── scripts/
│   │   │   └── test-flow.ts    # Automated end-to-end verification test suite
│   │   ├── types/              # Backend TypeScript type definitions
│   │   └── server.ts           # Server initialization and express app
│   ├── .env                    # Backend environment config
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/index.ts        # Typed Axios API service methods
│   │   ├── components/
│   │   │   ├── layout/         # AppLayout, Sidebar, Header, ProtectedRoute
│   │   │   └── ui/             # Modal, ConfirmDialog
│   │   ├── context/            # AuthContext (login, logout, role helpers)
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── CustomersPage.tsx
│   │   │   ├── CustomerDetailPage.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   ├── InventoryPage.tsx
│   │   │   ├── ChallansPage.tsx
│   │   │   ├── ChallanCreatePage.tsx
│   │   │   └── ChallanDetailPage.tsx
│   │   ├── types/index.ts      # Frontend TypeScript types
│   │   ├── App.tsx             # Route definitions
│   │   ├── index.css           # Modern design system & responsive layout styles
│   │   └── main.tsx
│   ├── .env                    # Frontend API URL configuration
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── postman_collection.json     # Complete Postman Collection
└── README.md
```

---

## Demo Login Credentials

The application automatically seeds 4 users representing each role. Use the credentials below or click the 1-click login buttons on the login screen:

| Role | Email | Password | Allowed Access Modules |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `Admin@123` | Full access to all modules, actions, and settings |
| **Sales** | `sales@example.com` | `Sales@123` | Customers CRM, Create & Confirm Challans, Dashboard |
| **Warehouse** | `warehouse@example.com` | `Warehouse@123` | Products Catalog, Stock Movement Adjustments, Inventory |
| **Accounts** | `accounts@example.com` | `Accounts@123` | Financial Dashboard, Challans View, Stock Movement Ledger |

---

## Role-Based Access Control (RBAC)

Permissions are enforced on **both** the frontend UI and the backend Express routes:

| Feature / API Endpoint | Admin | Sales | Warehouse | Accounts |
| :--- | :---: | :---: | :---: | :---: |
| **View Dashboard** (`GET /api/dashboard/stats`) | ✅ | ✅ | ✅ | ✅ |
| **View Customers** (`GET /api/customers`) | ✅ | ✅ | ❌ | ✅ |
| **Modify Customers** (`POST/PUT/DELETE /api/customers`) | ✅ | ✅ | ❌ | ❌ |
| **View Products** (`GET /api/products`) | ✅ | ✅ | ✅ | ✅ |
| **Modify Products** (`POST/PUT/DELETE /api/products`) | ✅ | ❌ | ✅ | ❌ |
| **View Stock Movements** (`GET /api/stock-movements`) | ✅ | ❌ | ✅ | ✅ |
| **Manual Stock Inbound/Outbound** (`POST /api/stock-movements`) | ✅ | ❌ | ✅ | ❌ |
| **View Sales Challans** (`GET /api/challans`) | ✅ | ✅ | ✅ | ✅ |
| **Create & Confirm Challan** (`POST /api/challans/*`) | ✅ | ✅ | ❌ | ❌ |

---

## Critical Business Logic

### 1. Delivery Challan Stock Policy & Transactions
- **Draft Challans:** Saving an order as a `Draft` reserves line items for customer review without touching product inventory.
- **Challan Confirmation:** When a challan is confirmed:
  1. The backend opens a safe database transaction (`BEGIN`).
  2. It queries latest stock levels for every line item.
  3. If **ANY** item has insufficient stock (`current_stock < requested_quantity`), the transaction is **aborted immediately** (`ROLLBACK`) and returns a clean `400 Bad Request` with an exact error message:
     ```json
     {
       "success": false,
       "message": "Insufficient stock for product: Wireless 2D Handheld Barcode Scanner (Available: 4, Required: 10)"
     }
     ```
  4. No partial deductions are made if any product fails.
  5. If all items pass, `products.current_stock` is decremented for all items, corresponding `OUT` records are inserted into `stock_movements`, and challan status is updated to `Confirmed` (`COMMIT`).
  6. A confirmed challan cannot be confirmed again or modified.

### 2. Historical Product Snapshots
When items are attached to a challan, the backend records:
- `product_name_snapshot`
- `sku_snapshot`
- `unit_price_snapshot`
- `quantity`
- `total_price`

This ensures that future changes to product prices, descriptions, or SKUs in the catalog do not alter historical delivery challans and invoicing records.

### 3. Non-Negative Inventory Guarantee
- Backend check constraints (`CHECK (current_stock >= 0)`) and transaction-level validations ensure warehouse stock can **never become negative**. Manual stock adjustments or challan dispatches exceeding available units are rejected.

---

## Database Setup & Schema

The application uses standard PostgreSQL with 6 relational tables:
1. `users`: Stores user accounts, bcrypt password hashes, and roles.
2. `customers`: CRM accounts, contact details, GST numbers, customer types, follow-up dates, and notes.
3. `products`: Catalog items, unique SKUs, categories, unit prices, live stock, safety thresholds, and bin locations.
4. `stock_movements`: Immutable transaction ledger recording `product_id`, `quantity_changed`, `movement_type` (`IN`/`OUT`), `reason`, and `created_by`.
5. `challans`: Delivery documents, unique `challan_number`, customer relation, totals, and statuses (`Draft`, `Confirmed`, `Cancelled`).
6. `challan_items`: Product snapshot items linked to parent challans.

### Built-in Embedded Engine vs External PostgreSQL
- **Zero Config Mode:** By default, if `DATABASE_URL` is empty, the application uses `@electric-sql/pglite` stored in `backend/.data/postgres`. No external database installation is required!
- **External PostgreSQL Mode:** Set `DATABASE_URL=postgresql://postgres:password@localhost:5432/mini_erp` in `backend/.env` to connect to any local or cloud PostgreSQL instance.

---

## Environment Variables

### Backend (`backend/.env`)
```ini
PORT=5000
JWT_SECRET=mini_erp_crm_super_secure_jwt_secret_token_2026_key!
# Leave DATABASE_URL blank to use embedded persistent PostgreSQL (.data/postgres)
# Or set to your external PostgreSQL instance:
DATABASE_URL=
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
```ini
VITE_API_URL=http://localhost:5000/api
```

---

## Installation & Local Run Guide

### Prerequisites
- Node.js 18+ installed
- npm 9+ installed

### 1. Start the Backend Server
```bash
cd backend
npm install
npm run dev
```
> Upon startup, database migrations run automatically and seed demo users, products, customers, and stock movements.
> The API will be running on `http://localhost:5000`.

### 2. Start the Frontend Application
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
> The frontend application will open on `http://localhost:5173`.

---

## Running Automated Tests

An automated end-to-end verification suite validates the complete operational flow against the live database:
```bash
cd backend
npm test
```
The test verifies:
- Health check and JWT generation
- All 4 role logins and invalid password rejection (401)
- Role authorization boundaries (Warehouse cannot create challans, Sales cannot adjust stock, Accounts cannot delete records)
- Customer creation and product setup
- Draft challan creation (verifies stock is NOT reduced)
- Challan confirmation (verifies atomic stock deduction and OUT movement generation)
- Double confirmation prevention
- Insufficient stock rejection (verifies 400 Bad Request and zero partial deductions)
- Dashboard analytics aggregation

---

## API Documentation

### Authentication
- `POST /api/auth/login` — Sign in with email and password, returns JWT token.
- `GET /api/auth/me` — Retrieve profile of currently authenticated user.

### Customer CRM
- `GET /api/customers?search=&status=&type=&page=&limit=` — List customers with filters and pagination.
- `GET /api/customers/:id` — Get customer profile and linked challans.
- `POST /api/customers` — Create customer account.
- `PUT /api/customers/:id` — Update customer details or CRM follow-up notes.
- `DELETE /api/customers/:id` — Delete customer (prevented if challans exist).

### Products & Catalog
- `GET /api/products?search=&category=&stockStatus=` — List products with filters.
- `GET /api/products/:id` — Get product details and recent stock movements.
- `POST /api/products` — Add new product SKU to catalog.
- `PUT /api/products/:id` — Update product specifications and minimum safety stock.
- `DELETE /api/products/:id` — Delete product.

### Inventory & Stock Movements
- `GET /api/stock-movements?product_id=&limit=` — Audit ledger of stock movements.
- `POST /api/stock-movements` — Record manual stock adjustment (`IN` or `OUT`).

### Sales Delivery Challans
- `GET /api/challans?status=&search=&customer_id=&page=&limit=` — List challans.
- `GET /api/challans/:id` — Get challan document with product snapshots.
- `POST /api/challans` — Create new challan (as `Draft` or `Confirmed`).
- `PUT /api/challans/:id` — Update draft challan line items and notes.
- `POST /api/challans/:id/confirm` — Transactional confirmation and inventory deduction.
- `POST /api/challans/:id/cancel` — Cancel draft challan.

### Dashboard
- `GET /api/dashboard/stats` — Aggregate metrics, low-stock warnings, and recent activity.

---

## Postman Collection

A Postman collection is included in the project root:
- File: [`postman_collection.json`](file:///c:/Users/HP/.gemini/antigravity-ide/scratch/mini-erp-crm/postman_collection.json)
- Includes environment variables for `baseUrl` and automatic JWT token extraction upon login.

---

## Deployment Guide

### Deploying Frontend (Vercel / Netlify)
1. Set the build command to `npm run build` and output directory to `dist`.
2. Set environment variable: `VITE_API_URL=https://your-backend-domain.com/api`.

### Deploying Backend (Render / Railway / Fly.io)
1. Build command: `npm run build`
2. Start command: `npm start`
3. Attach a managed PostgreSQL database (e.g. Supabase, Neon, or Render Postgres) and provide the `DATABASE_URL` environment variable.
4. Provide `JWT_SECRET` and `PORT`.

---

## Assumptions & Limitations

1. **Multi-Currency:** Prices and valuation are in Indian Rupees (INR `₹`) as per standard wholesale distribution convention, but the currency formatting utility can be adapted easily.
2. **Cancelled Challans:** Once a challan is `Confirmed` and goods are physically dispatched, it cannot be directly deleted or cancelled to preserve regulatory tax audit trails. Return merchandise authorizations (RMA) can be logged via an `IN` stock movement.
3. **Sequential Challan Numbering:** Challan numbers are auto-generated with format `CH-YYYYMMDD-XXX-RAND` to avoid numbering collisions across concurrent sales counters.
