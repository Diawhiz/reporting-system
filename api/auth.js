const crypto = require('crypto');
const { query, execute, initDb } = require('./db');

// Helper to hash passwords using PBKDF2 (native, secure, serverless-friendly)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const checkHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === checkHash;
}

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
    const { action } = req.query;
    
    if (req.method === 'POST') {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const cleanUsername = username.trim().toLowerCase();

      if (action === 'register') {
        // Check if username exists
        const existing = await query('SELECT id FROM users WHERE username = $1', [cleanUsername]);
        if (existing.length > 0) {
          return res.status(400).json({ error: 'Username already exists' });
        }

        const { salt, hash } = hashPassword(password);
        await execute(
          'INSERT INTO users (username, password, salt) VALUES ($1, $2, $3)',
          [cleanUsername, hash, salt]
        );
        return res.status(201).json({ message: 'User registered successfully. You can now login.' });
      }

      if (action === 'login') {
        const users = await query('SELECT * FROM users WHERE username = $1', [cleanUsername]);
        if (users.length === 0) {
          return res.status(400).json({ error: 'Invalid username or password' });
        }

        const user = users[0];
        const isValid = verifyPassword(password, user.salt, user.password);
        if (!isValid) {
          return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Create a new session token
        const token = crypto.randomBytes(32).toString('hex');
        await execute(
          'INSERT INTO sessions (token, user_id) VALUES ($1, $2)',
          [token, user.id]
        );

        return res.status(200).json({
          token,
          username: user.username
        });
      }
    }

    if (req.method === 'GET' && action === 'validate') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No session provided' });
      }
      const token = authHeader.split(' ')[1];
      const sessions = await query(
        'SELECT s.token, u.username FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1',
        [token]
      );
      if (sessions.length > 0) {
        return res.status(200).json({ valid: true, username: sessions[0].username });
      }
      return res.status(401).json({ error: 'Session expired' });
    }

    return res.status(400).json({ error: 'Invalid action or method' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
