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
      const { id, date, location, rider, product, price, fee } = req.body;
      if (!date || !location || !rider || !product) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const numPrice = parseFloat(price) || 0;
      const numFee = parseFloat(fee) || 0;

      if (id) {
        // Scope update to current user
        await execute(
          'UPDATE deliveries SET location = $1, rider = $2, product = $3, price = $4, fee = $5 WHERE id = $6 AND date = $7 AND user_id = $8',
          [location, rider, product, numPrice, numFee, id, date, userId]
        );
        return res.status(200).json({ message: 'Delivery updated successfully' });
      } else {
        // Save with current user's ID
        await execute(
          'INSERT INTO deliveries (date, location, rider, product, price, fee, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [date, location, rider, product, numPrice, numFee, userId]
        );
        return res.status(201).json({ message: 'Delivery added successfully' });
      }
    }
    
    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
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
