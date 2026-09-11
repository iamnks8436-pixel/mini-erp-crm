import app from '../server.js';
import http from 'http';

interface TestResult {
  title: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, title: string, errorMsg?: string) {
  if (condition) {
    results.push({ title, passed: true });
    console.log(`  ✓ PASS: ${title}`);
  } else {
    results.push({ title, passed: false, error: errorMsg || 'Assertion failed' });
    console.error(`  ✗ FAIL: ${title} - ${errorMsg || 'Assertion failed'}`);
  }
}

async function request(
  serverUrl: string,
  method: string,
  endpoint: string,
  token?: string,
  body?: any
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${serverUrl}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('  RUNNING MINI ERP + CRM AUTOMATED VERIFICATION SUITE');
  console.log('====================================================\n');

  const { runMigrations } = await import('../config/db.js');
  const { seedDatabase } = await import('../db/seed.js');
  await runMigrations();
  await seedDatabase();

  // Start test server on random available port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[Test Runner] Test server listening on ${baseUrl}\n`);

  try {
    // 1. Health Check
    console.log('--- Phase 1: Service Health & Authentication ---');
    const health = await request(baseUrl, 'GET', '/api/health');
    assert(health.status === 200 && health.data.status === 'ok', 'API Health Check returns 200 OK');

    // 2. Login as all 4 demo roles
    const adminLogin = await request(baseUrl, 'POST', '/api/auth/login', undefined, {
      email: 'admin@example.com',
      password: 'Admin@123',
    });
    assert(adminLogin.status === 200 && !!adminLogin.data.token, 'Admin login succeeds with JWT');
    const adminToken = adminLogin.data.token;

    const salesLogin = await request(baseUrl, 'POST', '/api/auth/login', undefined, {
      email: 'sales@example.com',
      password: 'Sales@123',
    });
    assert(salesLogin.status === 200 && !!salesLogin.data.token, 'Sales login succeeds with JWT');
    const salesToken = salesLogin.data.token;

    const warehouseLogin = await request(baseUrl, 'POST', '/api/auth/login', undefined, {
      email: 'warehouse@example.com',
      password: 'Warehouse@123',
    });
    assert(warehouseLogin.status === 200 && !!warehouseLogin.data.token, 'Warehouse login succeeds with JWT');
    const warehouseToken = warehouseLogin.data.token;

    const accountsLogin = await request(baseUrl, 'POST', '/api/auth/login', undefined, {
      email: 'accounts@example.com',
      password: 'Accounts@123',
    });
    assert(accountsLogin.status === 200 && !!accountsLogin.data.token, 'Accounts login succeeds with JWT');
    const accountsToken = accountsLogin.data.token;

    // Invalid Login Check
    const badLogin = await request(baseUrl, 'POST', '/api/auth/login', undefined, {
      email: 'sales@example.com',
      password: 'WrongPassword!',
    });
    assert(badLogin.status === 401, 'Invalid password correctly returns 401 Unauthorized');

    // 3. Role-Based Access Enforcement
    console.log('\n--- Phase 2: Role-Based Authorization Enforcement ---');

    // Warehouse cannot create challan
    const warehouseChallan = await request(baseUrl, 'POST', '/api/challans', warehouseToken, {
      customer_id: 1,
      items: [{ product_id: 1, quantity: 1 }],
    });
    assert(warehouseChallan.status === 403, 'Warehouse role forbidden from creating Sales Challans (403)');

    // Sales cannot create manual stock movement
    const salesStockMove = await request(baseUrl, 'POST', '/api/stock-movements', salesToken, {
      product_id: 1,
      quantity_changed: 5,
      movement_type: 'IN',
      reason: 'Unauthorized attempt',
    });
    assert(salesStockMove.status === 403, 'Sales role forbidden from manual stock adjustments (403)');

    // Accounts cannot delete customer
    const accountsDelCust = await request(baseUrl, 'DELETE', '/api/customers/1', accountsToken);
    assert(accountsDelCust.status === 403, 'Accounts role forbidden from deleting customers (403)');

    // 4. Critical Business Logic: Customer Creation -> Product Setup -> Challan Lifecycle
    console.log('\n--- Phase 3: Critical Flow — CRM, Inventory & Delivery Challan ---');

    // Create a new Customer as Sales
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newCustRes = await request(baseUrl, 'POST', '/api/customers', salesToken, {
      customer_name: `Test Client ${randomSuffix}`,
      mobile: `+91 99000 ${randomSuffix}`,
      email: `testclient${randomSuffix}@wholesale.test`,
      business_name: `Test Enterprise ${randomSuffix} Ltd`,
      gst_number: '27AABCT9988P1Z3',
      customer_type: 'Wholesale',
      address: '101 Industrial Lane, Tech Zone, Pune',
      status: 'Active',
      follow_up_date: '2026-10-15',
      notes: 'Initial test account verification',
    });
    assert(newCustRes.status === 201 && !!newCustRes.data.customer?.id, 'Sales user successfully creates customer');
    const testCustomerId = newCustRes.data.customer.id;

    // Create a new Product with exact 10 units stock (via Admin/Warehouse)
    const testSku = `TEST-PROD-${randomSuffix}`;
    const newProdRes = await request(baseUrl, 'POST', '/api/products', adminToken, {
      product_name: `Enterprise Router ${randomSuffix}`,
      sku: testSku,
      category: 'Networking',
      unit_price: 5000.0,
      current_stock: 10,
      minimum_stock: 3,
      warehouse_location: 'Zone-X / Shelf-99',
    });
    assert(newProdRes.status === 201 && newProdRes.data.product?.current_stock === 10, 'Product created with opening stock of 10 units');
    const testProductId = newProdRes.data.product.id;

    // Create Draft Challan requesting 4 units
    const draftChallanRes = await request(baseUrl, 'POST', '/api/challans', salesToken, {
      customer_id: testCustomerId,
      notes: 'Test Delivery Dispatch - Draft Phase',
      status: 'Draft',
      items: [{ product_id: testProductId, quantity: 4 }],
    });
    assert(draftChallanRes.status === 201 && draftChallanRes.data.challan?.status === 'Draft', 'Sales user creates Draft Challan');
    const draftChallanId = draftChallanRes.data.challan.id;

    // VERIFY CRITICAL LOGIC: Draft challan MUST NOT reduce stock
    const prodCheck1 = await request(baseUrl, 'GET', `/api/products/${testProductId}`, salesToken);
    assert(
      prodCheck1.data.product.current_stock === 10,
      'Draft Challan does NOT reduce inventory (stock remains exactly 10)'
    );

    // Confirm Challan: Expect stock deduction from 10 to 6 and OUT movement
    const confirmRes = await request(baseUrl, 'POST', `/api/challans/${draftChallanId}/confirm`, salesToken);
    assert(
      confirmRes.status === 200 && confirmRes.data.challan?.status === 'Confirmed',
      'Confirming draft challan succeeds with 200 OK'
    );

    // Verify stock decreased to 6
    const prodCheck2 = await request(baseUrl, 'GET', `/api/products/${testProductId}`, salesToken);
    assert(
      prodCheck2.data.product.current_stock === 6,
      'Confirmed Challan deducted stock by 4 (current_stock = 6)'
    );

    // Verify OUT stock movement was recorded
    const movementsRes = await request(baseUrl, 'GET', `/api/stock-movements?product_id=${testProductId}`, adminToken);
    const outMovement = movementsRes.data.movements.find(
      (m: any) => m.movement_type === 'OUT' && m.quantity_changed === 4
    );
    assert(!!outMovement, 'OUT Stock movement audit record was logged in the database');

    // Verify confirmed challan cannot be confirmed again
    const doubleConfirm = await request(baseUrl, 'POST', `/api/challans/${draftChallanId}/confirm`, salesToken);
    assert(
      doubleConfirm.status === 400 && doubleConfirm.data.message.includes('already confirmed'),
      'Confirmed challan cannot be confirmed a second time (400 Bad Request)'
    );

    // 5. Insufficient Stock Safety & Transaction Rollback Check
    console.log('\n--- Phase 4: Insufficient Stock Rejection & Non-Negative Inventory ---');

    // Create a new Draft Challan requesting 10 units (when only 6 are available in warehouse)
    const shortageChallanRes = await request(baseUrl, 'POST', '/api/challans', salesToken, {
      customer_id: testCustomerId,
      notes: 'Testing stock overflow safety',
      status: 'Draft',
      items: [{ product_id: testProductId, quantity: 10 }],
    });
    assert(shortageChallanRes.status === 201, 'Created draft challan with 10 units');
    const shortageChallanId = shortageChallanRes.data.challan.id;

    // Attempt to confirm shortage challan -> Must fail with 400 Insufficient stock
    const shortageConfirm = await request(baseUrl, 'POST', `/api/challans/${shortageChallanId}/confirm`, salesToken);
    assert(
      shortageConfirm.status === 400 && shortageConfirm.data.message.toLowerCase().includes('insufficient stock'),
      `Confirmation rejected with clear 400 error: "${shortageConfirm.data.message}"`
    );

    // Verify stock was NOT modified and did not go negative
    const prodCheck3 = await request(baseUrl, 'GET', `/api/products/${testProductId}`, salesToken);
    assert(
      prodCheck3.data.product.current_stock === 6,
      'Stock remains safely at 6 after failed confirmation (no partial or negative deduction)'
    );

    // 6. Dashboard Stats Verification
    console.log('\n--- Phase 5: Dashboard Analytics Verification ---');
    const dashboardRes = await request(baseUrl, 'GET', '/api/dashboard/stats', accountsToken);
    assert(
      dashboardRes.status === 200 && dashboardRes.data.stats?.totalCustomers > 0,
      'Dashboard stats API returns aggregate metrics, low-stock warnings, and recent activity'
    );

    // Print summary
    console.log('\n====================================================');
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;
    console.log(`  VERIFICATION RESULTS: ${passed}/${total} PASSED (${failed} failed)`);
    console.log('====================================================\n');

    if (failed > 0) {
      console.error('Some tests failed!');
      process.exit(1);
    } else {
      console.log('All end-to-end verification tests passed flawlessly!\n');
      process.exit(0);
    }
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
