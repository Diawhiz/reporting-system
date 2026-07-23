const { query, execute, initDb } = require('./db');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await initDb();
    const { method } = req;
    
    if (method === 'GET') {
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }
      const rows = await query('SELECT * FROM expenses WHERE date = $1 ORDER BY id ASC', [date]);
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
        // Update existing record
        await execute(
          'UPDATE expenses SET description = $1, amount = $2 WHERE id = $3 AND date = $4',
          [desc, numAmt, id, date]
        );
        return res.status(200).json({ message: 'Expense updated successfully' });
      } else {
        // Create new record
        await execute(
          'INSERT INTO expenses (date, description, amount) VALUES ($1, $2, $3)',
          [date, desc, numAmt]
        );
        return res.status(201).json({ message: 'Expense added successfully' });
      }
    }
    
    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }
      await execute('DELETE FROM expenses WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Expense deleted successfully' });
    }
    
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
