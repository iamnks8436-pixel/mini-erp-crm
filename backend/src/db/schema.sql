-- Mini ERP + CRM Database Schema
-- Compatible with standard PostgreSQL 14+ and PGlite

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Sales', 'Warehouse', 'Accounts')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(150) NOT NULL,
    mobile VARCHAR(30) NOT NULL,
    email VARCHAR(255) NOT NULL,
    business_name VARCHAR(200) NOT NULL,
    gst_number VARCHAR(50),
    customer_type VARCHAR(50) NOT NULL CHECK (customer_type IN ('Retail', 'Wholesale', 'Distributor')),
    address TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Lead', 'Active', 'Inactive')),
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    minimum_stock INTEGER NOT NULL DEFAULT 10 CHECK (minimum_stock >= 0),
    warehouse_location VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_changed INTEGER NOT NULL CHECK (quantity_changed > 0),
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
    reason TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challans (
    id SERIAL PRIMARY KEY,
    challan_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    total_quantity INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Confirmed', 'Cancelled')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challan_items (
    id SERIAL PRIMARY KEY,
    challan_id INTEGER NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name_snapshot VARCHAR(200) NOT NULL,
    sku_snapshot VARCHAR(100) NOT NULL,
    unit_price_snapshot NUMERIC(12, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(customer_name);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challans_customer_id ON challans(customer_id);
CREATE INDEX IF NOT EXISTS idx_challans_status ON challans(status);
CREATE INDEX IF NOT EXISTS idx_challans_created_at ON challans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challan_items_challan_id ON challan_items(challan_id);
