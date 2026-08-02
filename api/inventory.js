const { query, execute, initDb, getUserId } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
console.log("METHOD:", req.method, "URL:", req.url, "ACTION:", req.query.action); 
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await initDb();
    
    // Check Authorization
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. Please login again.' });
    }

    const { method } = req;
    const { action } = req.query; // e.g. ?action=items, ?action=vendors, ?action=assign, ?action=vendor-stocks
    
    if (method === 'GET') {
      if (action === 'items') {
        const rows = await query('SELECT * FROM inventory_items WHERE user_id = $1 ORDER BY id ASC', [userId]);
        return res.status(200).json(rows);
      } else if (action === 'vendors') {
        const rows = await query('SELECT * FROM vendors WHERE user_id = $1 ORDER BY id ASC', [userId]);
        return res.status(200).json(rows);
      } else if (action === 'vendor-stocks') {
        const rows = await query(`
          SELECT vs.*, i.name as item_name, i.price as item_price, v.name as vendor_name 
          FROM vendor_stocks vs 
          JOIN inventory_items i ON vs.item_id = i.id 
          JOIN vendors v ON vs.vendor_id = v.id 
          WHERE v.user_id = $1
        `, [userId]);
        return res.status(200).json(rows);
      }
      return res.status(400).json({ error: 'Invalid GET action' });
    }
    
    if (method === 'POST') {
      if (action === 'items') {
        const { name, sku, unit_of_measure, price, general_stock_balance } = req.body;
        if (!name) return res.status(400).json({ error: 'Item name is required' });
        await execute(
          'INSERT INTO inventory_items (name, sku, unit_of_measure, price, general_stock_balance, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
          [name, sku, unit_of_measure, parseFloat(price) || 0, parseFloat(general_stock_balance) || 0, userId]
        );
        return res.status(201).json({ message: 'Item created' });
      } else if (action === 'vendors') {
        const { name, contact_info } = req.body;
        if (!name) return res.status(400).json({ error: 'Vendor name is required' });
        await execute(
          'INSERT INTO vendors (name, contact_info, user_id) VALUES ($1, $2, $3)',
          [name, contact_info, userId]
        );
        return res.status(201).json({ message: 'Vendor created' });
      } else if (action === 'assign') {
        const { vendor_id, item_id, quantity } = req.body;
        if (!vendor_id || !item_id || !quantity) return res.status(400).json({ error: 'Missing fields' });
        const qty = parseFloat(quantity);
        if (qty <= 0) return res.status(400).json({ error: 'Quantity must be positive' });
        
        // Ensure user owns vendor and item
        const itemRows = await query('SELECT * FROM inventory_items WHERE id = $1 AND user_id = $2', [item_id, userId]);
        if (itemRows.length === 0) return res.status(404).json({ error: 'Item not found' });
        const vendorRows = await query('SELECT * FROM vendors WHERE id = $1 AND user_id = $2', [vendor_id, userId]);
        if (vendorRows.length === 0) return res.status(404).json({ error: 'Vendor not found' });
        
        // Create or update vendor stock
        const stockRows = await query('SELECT id, quantity FROM vendor_stocks WHERE vendor_id = $1 AND item_id = $2', [vendor_id, item_id]);
        if (stockRows.length > 0) {
          await execute('UPDATE vendor_stocks SET quantity = quantity + $1 WHERE id = $2', [qty, stockRows[0].id]);
        } else {
          await execute('INSERT INTO vendor_stocks (vendor_id, item_id, quantity) VALUES ($1, $2, $3)', [vendor_id, item_id, qty]);
        }
        
        // Log transaction
        await execute(
          'INSERT INTO stock_transactions (item_id, vendor_id, quantity_change, type, user_id) VALUES ($1, $2, $3, $4, $5)',
          [item_id, vendor_id, qty, 'assignment', userId]
        );
        
        return res.status(200).json({ message: 'Stock assigned to vendor' });
      }
      return res.status(400).json({ error: 'Invalid POST action' });
    }
    
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    
    if (method === 'PUT') {
      if (action === 'vendor-stocks') {
        const { id, quantity } = req.body;
        if (!id || quantity === undefined) return res.status(400).json({ error: 'Missing fields' });
        const qty = parseFloat(quantity) || 0;
        
        // Verify ownership
        const stock = await query('SELECT vs.*, v.user_id FROM vendor_stocks vs JOIN vendors v ON vs.vendor_id = v.id WHERE vs.id = $1 AND v.user_id = $2', [id, userId]);
        if (stock.length > 0) {
           await execute('UPDATE vendor_stocks SET quantity = $1 WHERE id = $2', [qty, id]);
           return res.status(200).json({ message: 'Stock updated' });
        }
        return res.status(404).json({ error: 'Stock not found' });
      } else if (action === 'items') {
        const { id, price, general_stock_balance } = req.body;
        if (!id) return res.status(400).json({ error: 'Missing fields' });
        const pr = parseFloat(price) || 0;
        const bal = parseFloat(general_stock_balance) || 0;
        
        const item = await query('SELECT * FROM inventory_items WHERE id = $1 AND user_id = $2', [id, userId]);
        if (item.length > 0) {
           await execute('UPDATE inventory_items SET price = $1, general_stock_balance = $2 WHERE id = $3', [pr, bal, id]);
           return res.status(200).json({ message: 'Item updated' });
        }
        return res.status(404).json({ error: 'Item not found' });
      }
    }
    
    if (method === 'DELETE') {
      if (action === 'items') {
        const { id } = req.query;
        await execute('DELETE FROM inventory_items WHERE id = $1 AND user_id = $2', [id, userId]);
        return res.status(200).json({ message: 'Item deleted' });
      } else if (action === 'vendors') {
        const { id } = req.query;
        await execute('DELETE FROM vendors WHERE id = $1 AND user_id = $2', [id, userId]);
        return res.status(200).json({ message: 'Vendor deleted' });
      } else if (action === 'vendor-stocks') {
        const id = parseInt(req.query.id, 10);
        const stock = await query('SELECT vs.*, v.user_id FROM vendor_stocks vs JOIN vendors v ON vs.vendor_id = v.id WHERE vs.id = $1 AND v.user_id = $2', [id, userId]);
        if (stock.length > 0) {
           await execute('DELETE FROM vendor_stocks WHERE id = $1', [id]);
        }
        return res.status(200).json({ message: 'Stock deleted' });
      }
      return res.status(400).json({ error: 'Invalid DELETE action' });
    }

    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    console.error('Inventory API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
