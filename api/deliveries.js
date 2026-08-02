const { query, execute, initDb, getUserId } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

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
    
    if (method === 'GET') {
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }
      // Scope query to current user
      const rows = await query('SELECT * FROM deliveries WHERE date = $1 AND user_id = $2 ORDER BY id ASC', [date, userId]);
      return res.status(200).json(rows);
    }
    
    if (method === 'POST') {
      const { id, date, location, rider, product, price, fee, vendor_id, item_id, quantity } = req.body;
      if (!date || !location || !rider || !product) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const numPrice = parseFloat(price) || 0;
      const numFee = parseFloat(fee) || 0;
      const numQuantity = parseFloat(quantity) || 0;

      if (id) {
        // Fetch old delivery to revert stock if necessary
        const oldDelivery = await query('SELECT vendor_id, item_id, quantity FROM deliveries WHERE id = $1 AND date = $2 AND user_id = $3', [id, date, userId]);
        if (oldDelivery.length > 0) {
            const old = oldDelivery[0];
            if (old.vendor_id && old.item_id && old.quantity > 0) {
                // Revert old deduction
                await execute('UPDATE vendor_stocks SET quantity = quantity + $1 WHERE vendor_id = $2 AND item_id = $3', [old.quantity, old.vendor_id, old.item_id]);
                await execute('INSERT INTO stock_transactions (item_id, vendor_id, quantity_change, type, reference_id, user_id) VALUES ($1, $2, $3, $4, $5, $6)', [old.item_id, old.vendor_id, old.quantity, 'correction', id, userId]);
            }
        }

        // Apply new deduction if applicable
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
        );
        return res.status(200).json({ message: 'Delivery updated successfully' });
      } else {
        // If it's a new delivery with inventory deduction
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
        }

        return res.status(201).json({ message: 'Delivery added successfully' });
      }
    }
    
    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }
      
      // Fetch delivery to revert stock
      const oldDelivery = await query('SELECT vendor_id, item_id, quantity FROM deliveries WHERE id = $1 AND user_id = $2', [id, userId]);
      if (oldDelivery.length > 0) {
          const old = oldDelivery[0];
          if (old.vendor_id && old.item_id && old.quantity > 0) {
              await execute('UPDATE vendor_stocks SET quantity = quantity + $1 WHERE vendor_id = $2 AND item_id = $3', [old.quantity, old.vendor_id, old.item_id]);
              await execute('INSERT INTO stock_transactions (item_id, vendor_id, quantity_change, type, reference_id, user_id) VALUES ($1, $2, $3, $4, $5, $6)', [old.item_id, old.vendor_id, old.quantity, 'reversion', id, userId]);
          }
      }
      
      // Scope delete to current user
      await execute('DELETE FROM deliveries WHERE id = $1 AND user_id = $2', [id, userId]);
      return res.status(200).json({ message: 'Delivery deleted successfully' });
    }
    
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
