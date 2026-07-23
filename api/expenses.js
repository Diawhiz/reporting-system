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
      const rows = await query('SELECT * FROM expenses WHERE date = $1 AND user_id = $2 ORDER BY id ASC', [date, userId]);
      const formatted = rows.map(r => ({
        id: r.id,
        date: r.date,
        desc: r.description || r.desc,
        amt: Number(r.amount || r.amt) || 0
      }));
      return res.status(200).json(formatted);
    }
    
    if (method === 'POST') {
      const { id, date, desc, amt } = req.body;
      if (!date || !desc || amt === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const numAmt = parseFloat(amt) || 0;

      if (id) {
        // Scope update to current user
        await execute(
          'UPDATE expenses SET description = $1, amount = $2 WHERE id = $3 AND date = $4 AND user_id = $5',
          [desc, numAmt, id, date, userId]
        );
        return res.status(200).json({ message: 'Expense updated successfully' });
      } else {
        // Save with current user's ID
        await execute(
          'INSERT INTO expenses (date, description, amount, user_id) VALUES ($1, $2, $3, $4)',
          [date, desc, numAmt, userId]
        );
        return res.status(201).json({ message: 'Expense added successfully' });
      }
    }
    
    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }
      // Scope delete to current user
      await execute('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
      return res.status(200).json({ message: 'Expense deleted successfully' });
    }
    
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
