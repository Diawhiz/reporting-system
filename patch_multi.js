const fs = require('fs');

// --- 1. Patch api/db.js ---
let dbCode = fs.readFileSync('api/db.js', 'utf8');
if (!dbCode.includes('items_json TEXT')) {
    dbCode = dbCode.replace(
        'await database.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS quantity NUMERIC(12, 2) DEFAULT 0;`);',
        'await database.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS quantity NUMERIC(12, 2) DEFAULT 0;`);\n      await database.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS items_json TEXT;`);'
    );
    dbCode = dbCode.replace(
        'database.run(`ALTER TABLE deliveries ADD COLUMN user_id INTEGER;`, () => {});',
        'database.run(`ALTER TABLE deliveries ADD COLUMN user_id INTEGER;`, () => {});\n        database.run(`ALTER TABLE deliveries ADD COLUMN items_json TEXT;`, () => {});'
    );
    fs.writeFileSync('api/db.js', dbCode);
}

// --- 2. Patch index.html ---
let htmlCode = fs.readFileSync('index.html', 'utf8');
const oldVendorHtml = `                            <div class="input-group">
                                <label for="delivery-vendor">Vendor</label>
                                <input type="text" placeholder="Search Vendor..." oninput="filterSelect('delivery-vendor', this.value)" style="margin-bottom: 5px; padding: 6px 10px; font-size: 0.85rem; border-radius: 6px; border: 1px solid var(--surface-border); background: var(--input-bg); color: var(--text); outline:none;">
                                <select id="delivery-vendor" class="styled-select"><option value="">-- Select Vendor --</option></select>
                            </div>
                            
                            <div class="input-group">
                                <label for="delivery-item">Inventory Item</label>
                                <input type="text" placeholder="Search Item..." oninput="filterSelect('delivery-item', this.value)" style="margin-bottom: 5px; padding: 6px 10px; font-size: 0.85rem; border-radius: 6px; border: 1px solid var(--surface-border); background: var(--input-bg); color: var(--text); outline:none;">
                                <select id="delivery-item" class="styled-select" onchange="onDeliveryItemChange()"><option value="">-- Select Item --</option></select>
                            </div>
                            
                            <div class="input-group">
                                <label for="delivery-quantity">Item Quantity</label>
                                <input type="number" id="delivery-quantity" placeholder="0">
                            </div>`;
const newVendorHtml = `                            <div class="input-group full-width" style="border: 1px solid var(--surface-border); padding: 10px; border-radius: 6px; margin-bottom: 10px; background: var(--surface-bg);">
                                <label style="margin-bottom: 10px; display: block; font-weight: 600;">Order Items (Optional)</label>
                                <div id="delivery-items-container"></div>
                                <button type="button" class="btn btn-secondary" onclick="addDeliveryItemRow()" style="padding: 6px 12px; font-size: 0.8rem; width: auto; margin-top: 10px;">+ Add Product from Inventory</button>
                            </div>`;
if (htmlCode.includes(oldVendorHtml)) {
    htmlCode = htmlCode.replace(oldVendorHtml, newVendorHtml);
    fs.writeFileSync('index.html', htmlCode);
}

// --- 3. Patch api/deliveries.js ---
let delCode = fs.readFileSync('api/deliveries.js', 'utf8');
if (!delCode.includes('items_json')) {
    delCode = delCode.replace(
        'const { id, date, location, rider, product, price, fee, vendor_id, item_id, quantity } = req.body;',
        'const { id, date, location, rider, product, price, fee, vendor_id, item_id, quantity, items_json } = req.body;'
    );
    delCode = delCode.replace(
        'const oldDelivery = await query(\'SELECT vendor_id, item_id, quantity FROM deliveries WHERE id = $1 AND date = $2 AND user_id = $3\', [id, date, userId]);\n        if (oldDelivery.length > 0) {\n            const old = oldDelivery[0];\n            if (old.vendor_id && old.item_id && old.quantity > 0) {\n                // Revert old deduction\n                await execute(\'UPDATE vendor_stocks SET quantity = quantity + $1 WHERE vendor_id = $2 AND item_id = $3\', [old.quantity, old.vendor_id, old.item_id]);\n                await execute(\'INSERT INTO stock_transactions (item_id, vendor_id, quantity_change, type, reference_id, user_id) VALUES ($1, $2, $3, $4, $5, $6)\', [old.item_id, old.vendor_id, old.quantity, \'correction\', id, userId]);\n            }\n        }',
        `const oldDelivery = await query('SELECT vendor_id, item_id, quantity, items_json FROM deliveries WHERE id = $1 AND date = $2 AND user_id = $3', [id, date, userId]);
        if (oldDelivery.length > 0) {
            const old = oldDelivery[0];
            const oldItems = old.items_json ? JSON.parse(old.items_json) : [];
            if (old.vendor_id && old.item_id && old.quantity > 0) {
                oldItems.push({ vendor_id: old.vendor_id, item_id: old.item_id, quantity: old.quantity });
            }
            for (const item of oldItems) {
                if (item.vendor_id && item.item_id && item.quantity > 0) {
                    await execute('UPDATE vendor_stocks SET quantity = quantity + $1 WHERE vendor_id = $2 AND item_id = $3', [item.quantity, item.vendor_id, item.item_id]);
                    await execute('INSERT INTO stock_transactions (item_id, vendor_id, quantity_change, type, reference_id, user_id) VALUES ($1, $2, $3, $4, $5, $6)', [item.item_id, item.vendor_id, item.quantity, 'correction', id, userId]);
                }
            }
        }`
    );
    delCode = delCode.replace(
        `        // Apply new deduction if applicable
        if (vendor_id && item_id && numQuantity > 0) {
            const updateRes = await execute('UPDATE vendor_stocks SET quantity = quantity - $1 WHERE vendor_id = $2 AND item_id = $3 AND quantity >= $4', [numQuantity, vendor_id, item_id, numQuantity]);
            const changes = updateRes.changes !== undefined ? updateRes.changes : updateRes.rowCount;
            if (changes === 0) {
                // If the new deduction fails, we should ideally rollback the revert, but for simplicity we return error
                return res.status(400).json({ error: 'Insufficient stock or invalid vendor/item for new quantity.' });
            }
            await execute('INSERT INTO stock_transactions (item_id, vendor_id, quantity_change, type, reference_id, user_id) VALUES ($1, $2, $3, $4, $5, $6)', [item_id, vendor_id, -numQuantity, 'deduction', id, userId]);
        }

        // Scope update to current user
        await execute(
          'UPDATE deliveries SET location = $1, rider = $2, product = $3, price = $4, fee = $5, vendor_id = $6, item_id = $7, quantity = $8 WHERE id = $9 AND date = $10 AND user_id = $11',
          [location, rider, product, numPrice, numFee, vendor_id || null, item_id || null, numQuantity, id, date, userId]
        );`,
        `        // Apply new deduction if applicable
        const itemsArr = items_json ? JSON.parse(items_json) : [];
        if (vendor_id && item_id && numQuantity > 0) {
            itemsArr.push({ vendor_id, item_id, quantity: numQuantity });
        }
        for (const item of itemsArr) {
            if (item.vendor_id && item.item_id && item.quantity > 0) {
                const updateRes = await execute('UPDATE vendor_stocks SET quantity = quantity - $1 WHERE vendor_id = $2 AND item_id = $3 AND quantity >= $4', [item.quantity, item.vendor_id, item.item_id, item.quantity]);
                const changes = updateRes.changes !== undefined ? updateRes.changes : updateRes.rowCount;
                if (changes === 0) {
                    return res.status(400).json({ error: 'Insufficient stock or invalid vendor/item for new quantity.' });
                }
                await execute('INSERT INTO stock_transactions (item_id, vendor_id, quantity_change, type, reference_id, user_id) VALUES ($1, $2, $3, $4, $5, $6)', [item.item_id, item.vendor_id, -item.quantity, 'deduction', id, userId]);
            }
        }

        // Scope update to current user
        await execute(
          'UPDATE deliveries SET location = $1, rider = $2, product = $3, price = $4, fee = $5, vendor_id = NULL, item_id = NULL, quantity = 0, items_json = $6 WHERE id = $7 AND date = $8 AND user_id = $9',
          [location, rider, product, numPrice, numFee, JSON.stringify(itemsArr), id, date, userId]
        );`
    );
    delCode = delCode.replace(
        `        // If it's a new delivery with inventory deduction
        if (vendor_id && item_id && numQuantity > 0) {
          // Atomic stock deduction to handle concurrency and insufficient stock
          const updateRes = await execute(
            'UPDATE vendor_stocks SET quantity = quantity - $1 WHERE vendor_id = $2 AND item_id = $3 AND quantity >= $4',
            [numQuantity, vendor_id, item_id, numQuantity]
          );
          
          const changes = updateRes.changes !== undefined ? updateRes.changes : updateRes.rowCount;
          if (changes === 0) {
            return res.status(400).json({ error: 'Insufficient stock or invalid vendor/item.' });
          }
        }

        // Save with current user's ID
        const insertRes = await execute(
          'INSERT INTO deliveries (date, location, rider, product, price, fee, vendor_id, item_id, quantity, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [date, location, rider, product, numPrice, numFee, vendor_id || null, item_id || null, numQuantity, userId]
        );

        if (vendor_id && item_id && numQuantity > 0) {
          const newDeliveryId = insertRes.lastID || (insertRes.rows && insertRes.rows[0] ? insertRes.rows[0].id : null);
          await execute(
            'INSERT INTO stock_transactions (item_id, vendor_id, quantity_change, type, reference_id, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [item_id, vendor_id, -numQuantity, 'deduction', newDeliveryId, userId]
          );
        }`,
        `        // If it's a new delivery with inventory deduction
        const itemsArr = items_json ? JSON.parse(items_json) : [];
        if (vendor_id && item_id && numQuantity > 0) {
            itemsArr.push({ vendor_id, item_id, quantity: numQuantity });
        }
        for (const item of itemsArr) {
            if (item.vendor_id && item.item_id && item.quantity > 0) {
                const updateRes = await execute('UPDATE vendor_stocks SET quantity = quantity - $1 WHERE vendor_id = $2 AND item_id = $3 AND quantity >= $4', [item.quantity, item.vendor_id, item.item_id, item.quantity]);
                const changes = updateRes.changes !== undefined ? updateRes.changes : updateRes.rowCount;
                if (changes === 0) {
                    return res.status(400).json({ error: 'Insufficient stock or invalid vendor/item.' });
                }
            }
        }

        // Save with current user's ID
        const insertRes = await execute(
          'INSERT INTO deliveries (date, location, rider, product, price, fee, vendor_id, item_id, quantity, user_id, items_json) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, 0, $7, $8)',
          [date, location, rider, product, numPrice, numFee, userId, JSON.stringify(itemsArr)]
        );
        const newDeliveryId = insertRes.lastID || (insertRes.rows && insertRes.rows[0] ? insertRes.rows[0].id : null);

        for (const item of itemsArr) {
            if (item.vendor_id && item.item_id && item.quantity > 0) {
                await execute('INSERT INTO stock_transactions (item_id, vendor_id, quantity_change, type, reference_id, user_id) VALUES ($1, $2, $3, $4, $5, $6)', [item.item_id, item.vendor_id, -item.quantity, 'deduction', newDeliveryId, userId]);
            }
        }`
    );
    fs.writeFileSync('api/deliveries.js', delCode);
}

console.log("Done");
