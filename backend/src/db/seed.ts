import bcrypt from 'bcryptjs';
import { db, runMigrations } from '../config/db.js';

export async function seedDatabase(): Promise<void> {
  console.log('[Seed] Running migrations first...');
  await runMigrations();

  console.log('[Seed] Checking existing users...');
  const userCheck = await db.query('SELECT COUNT(*) as count FROM users');
  const userCount = parseInt(userCheck.rows[0]?.count || '0', 10);

  if (userCount > 0) {
    console.log('[Seed] Database already seeded. Skipping initial seeding.');
    return;
  }

  console.log('[Seed] Seeding demo users with hashed passwords...');
  const saltRounds = 10;
  const adminHash = await bcrypt.hash('Admin@123', saltRounds);
  const salesHash = await bcrypt.hash('Sales@123', saltRounds);
  const warehouseHash = await bcrypt.hash('Warehouse@123', saltRounds);
  const accountsHash = await bcrypt.hash('Accounts@123', saltRounds);

  const adminUser = await db.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['Alex Morgan (Admin)', 'admin@example.com', adminHash, 'Admin']
  );

  const salesUser = await db.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['Sarah Jenkins (Sales)', 'sales@example.com', salesHash, 'Sales']
  );

  const warehouseUser = await db.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['Walter White (Warehouse)', 'warehouse@example.com', warehouseHash, 'Warehouse']
  );

  const accountsUser = await db.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    ['Arthur Pendelton (Accounts)', 'accounts@example.com', accountsHash, 'Accounts']
  );

  const adminId = adminUser.rows[0].id;
  const salesId = salesUser.rows[0].id;
  const warehouseId = warehouseUser.rows[0].id;

  console.log('[Seed] Seeding 9 realistic wholesale customers...');
  const customers = [
    {
      name: 'Rajesh Sharma',
      mobile: '+91 98201 44551',
      email: 'rajesh@apextelecom.in',
      business: 'Apex Telecom & IT Distributors',
      gst: '27AABCA1234F1Z8',
      type: 'Distributor',
      address: 'Plot 42, Electronics Zone, MIDC Industrial Area, Mumbai, MH 400093',
      status: 'Active',
      followUp: '2026-09-20',
      notes: 'Key distributor for Western region. High monthly volume. Negotiated 30-day net credit.',
    },
    {
      name: 'Sunita Reddy',
      mobile: '+91 94401 22889',
      email: 'sunita@metrotechsupplies.com',
      business: 'Metro Tech Retail Supplies',
      gst: '36AAACM5678K1Z2',
      type: 'Wholesale',
      address: 'Shop 12-15, Commercial Complex, Ameerpet, Hyderabad, TS 500016',
      status: 'Active',
      followUp: '2026-09-18',
      notes: 'Ordered 50+ barcode scanners last quarter. Inquiring about bulk discount on thermal printers.',
    },
    {
      name: 'Vikram Mehta',
      mobile: '+91 98112 33445',
      email: 'vikram@horizonchains.co.in',
      business: 'Horizon Retail Enterprise Chains',
      gst: '07AAECH9988D1Z4',
      type: 'Wholesale',
      address: 'B-14/3, Okhla Industrial Area Phase II, New Delhi, DL 110020',
      status: 'Active',
      followUp: '2026-09-25',
      notes: 'Supplies 14 retail branches across NCR. Requires standardized delivery challans for accounting.',
    },
    {
      name: 'Deepak Patel',
      mobile: '+91 98980 11223',
      email: 'deepak@zenithlogistics.net',
      business: 'Zenith Logistics & Hardware Mart',
      gst: '24AABFZ7711M1Z1',
      type: 'Distributor',
      address: 'Warehouse Hub 8, GIDC Industrial Estate, Vatva, Ahmedabad, GJ 382445',
      status: 'Active',
      followUp: '2026-10-02',
      notes: 'Primary hub in Gujarat. Interested in stocking high-speed networking cables and server accessories.',
    },
    {
      name: 'Kavita Nair',
      mobile: '+91 97441 55667',
      email: 'kavita@bluewavegadgets.com',
      business: 'BlueWave Digital Gadgets & Accessories',
      gst: '32AAKCB4433P1Z5',
      type: 'Retail',
      address: '2nd Floor, Grand Tech Mall, MG Road, Kochi, KL 682016',
      status: 'Lead',
      followUp: '2026-09-15',
      notes: 'Potential wholesale buyer transitioning from small retail. Scheduled product catalog demo.',
    },
    {
      name: 'Anand Kulkarni',
      mobile: '+91 98220 77889',
      email: 'anand@pioneerindustrial.in',
      business: 'Pioneer Industrial Automation Tools',
      gst: '27AABCP8822H1Z6',
      type: 'Distributor',
      address: 'Sector 10, Bhosari Industrial Area, Pune, MH 411026',
      status: 'Active',
      followUp: '2026-09-30',
      notes: 'Long-term customer. Consistently requires heavy duty power strips and barcode terminals.',
    },
    {
      name: 'Pooja Agarwal',
      mobile: '+91 93310 99881',
      email: 'pooja@summitwholesale.com',
      business: 'Summit Wholesale Mart East',
      gst: '19AAACS3322L1Z9',
      type: 'Wholesale',
      address: 'C-88, Salt Lake Sector V, Kolkata, WB 700091',
      status: 'Active',
      followUp: '2026-09-28',
      notes: 'Regional distribution channel partner. Excellent payment history.',
    },
    {
      name: 'Manoj Verma',
      mobile: '+91 98390 12345',
      email: 'manoj@novasmart.in',
      business: 'Nova Smart Device Solutions',
      gst: '09AAAFN6655G1Z3',
      type: 'Retail',
      address: 'Civil Lines, Hazratganj, Lucknow, UP 226001',
      status: 'Inactive',
      followUp: null,
      notes: 'Temporarily inactive due to store renovation. Expected to resume wholesale orders next quarter.',
    },
    {
      name: 'Siddharth Roy',
      mobile: '+91 98300 45678',
      email: 'siddharth@quantumitdist.com',
      business: 'Quantum IT Distribution Network',
      gst: '19AAACQ1122B1Z7',
      type: 'Distributor',
      address: 'Tower B, Tech Park, Rajarhat, Kolkata, WB 700135',
      status: 'Lead',
      followUp: '2026-09-17',
      notes: 'Requested price quotation for 200 units of NVMe SSDs and USB-C Docks.',
    },
  ];

  const customerMap = new Map<string, number>();

  for (const c of customers) {
    const res = await db.query(
      `INSERT INTO customers (
        customer_name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [c.name, c.mobile, c.email, c.business, c.gst, c.type, c.address, c.status, c.followUp, c.notes]
    );
    customerMap.set(c.email, res.rows[0].id);
  }

  console.log('[Seed] Seeding 11 products (including low stock products)...');
  const products = [
    {
      name: 'Industrial USB-C Hub 10-Port Pro',
      sku: 'HUB-USBC-10P',
      category: 'Peripherals',
      price: 1850.00,
      stock: 45,
      minStock: 15,
      location: 'Warehouse-A / Shelf-02',
    },
    {
      name: 'Wireless 2D Handheld Barcode Scanner',
      sku: 'SCAN-BC-2D-WL',
      category: 'Point of Sale',
      price: 2450.00,
      stock: 4, // LOW STOCK (minStock 12)
      minStock: 12,
      location: 'Warehouse-A / Shelf-05',
    },
    {
      name: 'Thermal 80mm High-Speed Receipt Printer',
      sku: 'PRN-THRM-80MM',
      category: 'Point of Sale',
      price: 4200.00,
      stock: 2, // CRITICAL LOW STOCK (minStock 10)
      minStock: 10,
      location: 'Warehouse-A / Shelf-06',
    },
    {
      name: 'Mechanical Ergonomic Keyboard RGB',
      sku: 'KB-MECH-ERG-RGB',
      category: 'Peripherals',
      price: 3100.00,
      stock: 60,
      minStock: 20,
      location: 'Warehouse-B / Bin-11',
    },
    {
      name: '4K UltraHD Commercial Monitor 27-inch',
      sku: 'MON-4K-27-COMM',
      category: 'Displays',
      price: 18900.00,
      stock: 18,
      minStock: 8,
      location: 'Warehouse-C / Pallet-01',
    },
    {
      name: 'Cat6 Pure Copper Network Spool 305m',
      sku: 'CAB-CAT6-305M',
      category: 'Networking',
      price: 5200.00,
      stock: 35,
      minStock: 10,
      location: 'Warehouse-B / Rack-04',
    },
    {
      name: 'Heavy Duty 8-Way Rack Power Distribution Unit',
      sku: 'PDU-8WAY-16A',
      category: 'Power & Racks',
      price: 2900.00,
      stock: 28,
      minStock: 10,
      location: 'Warehouse-B / Rack-07',
    },
    {
      name: 'Active Noise Cancelling Wireless Headset',
      sku: 'AUD-ANC-WL-PRO',
      category: 'Audio',
      price: 3600.00,
      stock: 50,
      minStock: 15,
      location: 'Warehouse-A / Shelf-09',
    },
    {
      name: 'High-Speed Gen4 NVMe SSD 1TB Enterprise',
      sku: 'SSD-GEN4-1TB',
      category: 'Storage',
      price: 6400.00,
      stock: 75,
      minStock: 25,
      location: 'Secure Vault / Locker-01',
    },
    {
      name: 'Multi-Port 120W GaN Desktop Fast Charger',
      sku: 'CHG-120W-GAN',
      category: 'Power & Racks',
      price: 2750.00,
      stock: 5, // LOW STOCK (minStock 15)
      minStock: 15,
      location: 'Warehouse-A / Shelf-03',
    },
    {
      name: 'Wi-Fi 6 AX3000 Dual-Band Commercial Gateway',
      sku: 'ROUT-AX3000-GW',
      category: 'Networking',
      price: 7800.00,
      stock: 22,
      minStock: 8,
      location: 'Warehouse-B / Rack-02',
    },
  ];

  const productMap = new Map<string, number>();

  for (const p of products) {
    const res = await db.query(
      `INSERT INTO products (
        product_name, sku, category, unit_price, current_stock, minimum_stock, warehouse_location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [p.name, p.sku, p.category, p.price, p.stock, p.minStock, p.location]
    );
    productMap.set(p.sku, res.rows[0].id);
  }

  console.log('[Seed] Seeding initial stock movement history...');
  const movements = [
    {
      sku: 'HUB-USBC-10P',
      qty: 50,
      type: 'IN',
      reason: 'Initial Container Inbound - Po# 90112',
      userId: warehouseId,
    },
    {
      sku: 'SCAN-BC-2D-WL',
      qty: 25,
      type: 'IN',
      reason: 'Inbound Supplier Shipment - Po# 90115',
      userId: warehouseId,
    },
    {
      sku: 'SCAN-BC-2D-WL',
      qty: 3,
      type: 'OUT',
      reason: 'Quality Control Sample Testing & Lab Certification',
      userId: warehouseId,
    },
    {
      sku: 'PRN-THRM-80MM',
      qty: 20,
      type: 'IN',
      reason: 'Initial Stock Inbound from Manufacturer',
      userId: warehouseId,
    },
    {
      sku: 'CAB-CAT6-305M',
      qty: 40,
      type: 'IN',
      reason: 'Direct Factory Dispatch Inbound',
      userId: warehouseId,
    },
    {
      sku: 'SSD-GEN4-1TB',
      qty: 100,
      type: 'IN',
      reason: 'Secure Bulk Storage Allocation',
      userId: warehouseId,
    },
  ];

  for (const m of movements) {
    const prodId = productMap.get(m.sku);
    if (prodId) {
      await db.query(
        `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [prodId, m.qty, m.type, m.reason, m.userId]
      );
    }
  }

  console.log('[Seed] Seeding demo sales challans (Draft, Confirmed, Cancelled)...');
  const apexCustId = customerMap.get('rajesh@apextelecom.in')!;
  const metroCustId = customerMap.get('sunita@metrotechsupplies.com')!;
  const horizonCustId = customerMap.get('vikram@horizonchains.co.in')!;

  // 1. Confirmed Challan: Apex Telecom
  const hubId = productMap.get('HUB-USBC-10P')!;
  const ssdId = productMap.get('SSD-GEN4-1TB')!;

  const ch1Number = 'CH-20260910-001-4412';
  const ch1Res = await db.query(
    `INSERT INTO challans (challan_number, customer_id, total_quantity, total_amount, status, notes, created_by)
     VALUES ($1, $2, $3, $4, 'Confirmed', $5, $6)
     RETURNING id`,
    [ch1Number, apexCustId, 15, 68950.00, 'Urgent dispatch for corporate deployment.', salesId]
  );
  const ch1Id = ch1Res.rows[0].id;

  // Items for Confirmed Challan
  await db.query(
    `INSERT INTO challan_items (challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity, total_price)
     VALUES 
     ($1, $2, 'Industrial USB-C Hub 10-Port Pro', 'HUB-USBC-10P', 1850.00, 5, 9250.00),
     ($1, $3, 'High-Speed Gen4 NVMe SSD 1TB Enterprise', 'SSD-GEN4-1TB', 6400.00, 10, 64000.00)`,
    [ch1Id, hubId, ssdId]
  );

  // Record OUT movements for the confirmed challan
  await db.query(
    `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
     VALUES 
     ($1, 5, 'OUT', 'Sales Challan Confirmed #CH-20260910-001-4412', $2),
     ($3, 10, 'OUT', 'Sales Challan Confirmed #CH-20260910-001-4412', $2)`,
    [hubId, salesId, ssdId]
  );

  // 2. Draft Challan: Metro Tech Retail Supplies
  const ch2Number = 'CH-20260911-002-8821';
  const pduId = productMap.get('PDU-8WAY-16A')!;
  const kbId = productMap.get('KB-MECH-ERG-RGB')!;

  const ch2Res = await db.query(
    `INSERT INTO challans (challan_number, customer_id, total_quantity, total_amount, status, notes, created_by)
     VALUES ($1, $2, $3, $4, 'Draft', $5, $6)
     RETURNING id`,
    [ch2Number, metroCustId, 8, 23900.00, 'Pending customer PO confirmation for retail store opening.', salesId]
  );
  const ch2Id = ch2Res.rows[0].id;

  await db.query(
    `INSERT INTO challan_items (challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity, total_price)
     VALUES 
     ($1, $2, 'Heavy Duty 8-Way Rack Power Distribution Unit', 'PDU-8WAY-16A', 2900.00, 3, 8700.00),
     ($1, $3, 'Mechanical Ergonomic Keyboard RGB', 'KB-MECH-ERG-RGB', 3100.00, 5, 15500.00)`,
    [ch2Id, pduId, kbId]
  );
  // Note: For Draft challan, no stock deduction or OUT movement is made!

  // 3. Cancelled Challan: Horizon Retail
  const ch3Number = 'CH-20260908-003-1109';
  const monId = productMap.get('MON-4K-27-COMM')!;

  const ch3Res = await db.query(
    `INSERT INTO challans (challan_number, customer_id, total_quantity, total_amount, status, notes, created_by)
     VALUES ($1, $2, $3, $4, 'Cancelled', $5, $6)
     RETURNING id`,
    [ch3Number, horizonCustId, 2, 37800.00, 'Customer changed procurement budget timeline.', salesId]
  );
  const ch3Id = ch3Res.rows[0].id;

  await db.query(
    `INSERT INTO challan_items (challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity, total_price)
     VALUES ($1, $2, '4K UltraHD Commercial Monitor 27-inch', 'MON-4K-27-COMM', 18900.00, 2, 37800.00)`,
    [ch3Id, monId]
  );

  console.log('[Seed] Database seeding completed successfully!');
}

// Allow direct execution: `node dist/db/seed.js` or `tsx src/db/seed.ts`
if (process.argv[1] && process.argv[1].includes('seed')) {
  seedDatabase()
    .then(() => {
      console.log('[Seed] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Error seeding database:', err);
      process.exit(1);
    });
}
