const express = require('express');
const { initDb, execute, query } = require('./api/db');
const deliveriesHandler = require('./api/deliveries');
const inventoryHandler = require('./api/inventory');

async function runTests() {
  console.log("Starting tests...");
  
  // Set up mock server
  const app = express();
  app.use(express.json());
  
  // Mock auth middleware for testing
  app.use((req, res, next) => {
    req.headers.authorization = 'Bearer testtoken';
    next();
  });
  
  app.all('/api/deliveries', deliveriesHandler);
  app.all('/api/inventory', inventoryHandler);
  
  await initDb();
  
  // Setup test user and session
  await execute('INSERT INTO users (id, username, password, salt) VALUES (1, "testuser", "pass", "salt") ON CONFLICT DO NOTHING');
  // For SQLite, ON CONFLICT DO NOTHING might fail if old sqlite, let's just ignore errors
  try { await execute('INSERT INTO users (username, password, salt) VALUES ("testuser", "pass", "salt")'); } catch (e) {}
  
  const user = await query('SELECT id FROM users WHERE username = "testuser"');
  const userId = user[0].id;
  try { await execute('INSERT INTO sessions (token, user_id) VALUES ("testtoken", ?)', [userId]); } catch (e) {}

  // 1. Create Vendor and Item
  const vRes = await fetch('http://localhost:3001/api/inventory?action=vendors', {
    method: 'POST', headers: { 'Authorization': 'Bearer testtoken', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Vendor' })
  });
  
  const iRes = await fetch('http://localhost:3001/api/inventory?action=items', {
    method: 'POST', headers: { 'Authorization': 'Bearer testtoken', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Item', sku: 'TI-01', unit_of_measure: 'pcs', general_stock_balance: 100 })
  });

  const vendors = await (await fetch('http://localhost:3001/api/inventory?action=vendors', { headers: { 'Authorization': 'Bearer testtoken' }})).json();
  const items = await (await fetch('http://localhost:3001/api/inventory?action=items', { headers: { 'Authorization': 'Bearer testtoken' }})).json();
  
  const vendorId = vendors[vendors.length-1].id;
  const itemId = items[items.length-1].id;

  // 2. Assign Stock
  await fetch('http://localhost:3001/api/inventory?action=assign', {
    method: 'POST', headers: { 'Authorization': 'Bearer testtoken', 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendor_id: vendorId, item_id: itemId, quantity: 50 })
  });

  console.log("Stock assigned (50). Testing normal deduction...");
  
  // 3. Test Normal Deduction
  const del1 = await fetch('http://localhost:3001/api/deliveries', {
    method: 'POST', headers: { 'Authorization': 'Bearer testtoken', 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2023-10-10', location: 'Loc 1', rider: 'Rider 1', product: 'Test Item', price: 1000, fee: 100, vendor_id: vendorId, item_id: itemId, quantity: 10 })
  });
  console.log("Normal deduction status:", del1.status === 201 ? "PASS" : "FAIL", await del1.text());

  // 4. Test Insufficient Stock
  console.log("Testing insufficient stock...");
  const del2 = await fetch('http://localhost:3001/api/deliveries', {
    method: 'POST', headers: { 'Authorization': 'Bearer testtoken', 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2023-10-10', location: 'Loc 1', rider: 'Rider 1', product: 'Test Item', price: 1000, fee: 100, vendor_id: vendorId, item_id: itemId, quantity: 50 })
  });
  console.log("Insufficient stock status (expect 400):", del2.status === 400 ? "PASS" : "FAIL", await del2.text());

  // 5. Test Concurrent Deductions
  console.log("Testing concurrent report submissions...");
  const p1 = fetch('http://localhost:3001/api/deliveries', {
    method: 'POST', headers: { 'Authorization': 'Bearer testtoken', 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2023-10-10', location: 'Loc 1', rider: 'Rider 1', product: 'Test Item', price: 1000, fee: 100, vendor_id: vendorId, item_id: itemId, quantity: 25 })
  });
  const p2 = fetch('http://localhost:3001/api/deliveries', {
    method: 'POST', headers: { 'Authorization': 'Bearer testtoken', 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2023-10-10', location: 'Loc 1', rider: 'Rider 1', product: 'Test Item', price: 1000, fee: 100, vendor_id: vendorId, item_id: itemId, quantity: 25 })
  });
  
  const [res1, res2] = await Promise.all([p1, p2]);
  console.log("Concurrent 1 status:", res1.status);
  console.log("Concurrent 2 status:", res2.status);
  // Both shouldn't succeed if total requested (50) > remaining (40).
  if (res1.status === 201 && res2.status === 400) console.log("Concurrent test PASS (1 succeeded, 1 blocked)");
  else if (res1.status === 400 && res2.status === 201) console.log("Concurrent test PASS (1 succeeded, 1 blocked)");
  else console.log("Concurrent test FAIL (Both succeeded or both failed unexpectedly)");

  process.exit(0);
}

const server = express();
server.use(express.json());
server.all('/api/deliveries', deliveriesHandler);
server.all('/api/inventory', inventoryHandler);

server.listen(3001, () => {
  runTests().catch(console.error);
});
