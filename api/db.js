require('dotenv').config();

const { Pool } = require('pg');

let db = null;
let isPostgres = true;

// Lazy-load database connection
function getDb() {
  if (db) return db;

  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (connectionString) {
    const cleanConnectionString = connectionString.replace(/(\?|&)sslmode=[^&]+/g, '');
    db = new Pool({
      connectionString: cleanConnectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    isPostgres = true;
  } else {
    // If on Vercel, do not attempt to fall back to SQLite, fail clearly
    if (process.env.VERCEL || process.env.NOW_REGION) {
      throw new Error("DATABASE_URL environment variable is missing on Vercel. Please add it to your environment variables in Vercel settings.");
    }

    // Local fallback to SQLite
    isPostgres = false;
    try {
      const sqlite3 = require('sqlite3').verbose();
      const path = require('path');
      const dbPath = path.resolve(process.cwd(), 'reporting.db');
      db = new sqlite3.Database(dbPath);
    } catch (err) {
      console.error('Failed to load SQLite:', err);
      throw err;
    }
  }
  return db;
}

// Helper to run query and return rows
async function query(text, params) {
  const database = getDb();
  if (isPostgres) {
    const res = await database.query(text, params);
    return res.rows;
  } else {
    return new Promise((resolve, reject) => {
      const sqliteText = text.replace(/\$\d+/g, () => '?');
      database.all(sqliteText, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

// Helper for INSERT / UPDATE / DELETE that returns info
async function execute(text, params) {
  const database = getDb();
  if (isPostgres) {
    const res = await database.query(text, params);
    return res;
  } else {
    return new Promise((resolve, reject) => {
      const sqliteText = text.replace(/\$\d+/g, () => '?');
      database.run(sqliteText, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
}

// Session authentication helper
async function getUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const rows = await query('SELECT user_id FROM sessions WHERE token = $1', [token]);
  if (rows.length > 0) {
    return rows[0].user_id;
  }
  return null;
}

// Initialize tables and apply migrations
async function initDb() {
  const database = getDb();
  if (isPostgres) {
    // 1. Create Core Users Table
    await database.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        salt VARCHAR(255) NOT NULL
      );
    `);

    // 2. Create Sessions Table
    await database.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create Deliveries & Expenses
    await database.query(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id SERIAL PRIMARY KEY,
        date VARCHAR(20) NOT NULL,
        location VARCHAR(255) NOT NULL,
        rider VARCHAR(255) NOT NULL,
        product VARCHAR(255) NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        fee NUMERIC(12, 2) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await database.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        date VARCHAR(20) NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 4. Alter existing columns if they don't have user_id (for backwards compatibility migration)
    try {
      await database.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`);
      await database.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`);
    } catch (e) {
      // Ignored if they already exist or ALTER not supported (older versions)
    }

    // 5. Create Inventory Management Tables
    await database.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_info VARCHAR(255),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await database.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        unit_of_measure VARCHAR(50),
        price NUMERIC(12, 2) DEFAULT 0,
        general_stock_balance NUMERIC(12, 2) DEFAULT 0,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await database.query(`
      CREATE TABLE IF NOT EXISTS vendor_stocks (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
        item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
        quantity NUMERIC(12, 2) DEFAULT 0
      );
    `);
    await database.query(`
      CREATE TABLE IF NOT EXISTS stock_transactions (
        id SERIAL PRIMARY KEY,
        item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
        vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
        quantity_change NUMERIC(12, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        reference_id INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    try {
      await database.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL;`);
      await database.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL;`);
      await database.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS quantity NUMERIC(12, 2) DEFAULT 0;`);
      await database.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS items_json TEXT;`);
      await database.query(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2) DEFAULT 0;`);
    } catch (e) {
      // Ignore
    }
  } else if (database) {
    return new Promise((resolve, reject) => {
      database.serialize(() => {
        database.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            salt TEXT NOT NULL
          );
        `);

        database.run(`
          CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        database.run(`
          CREATE TABLE IF NOT EXISTS deliveries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            location TEXT NOT NULL,
            rider TEXT NOT NULL,
            product TEXT NOT NULL,
            price REAL NOT NULL,
            fee REAL NOT NULL,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
          );
        `);

        database.run(`
          CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
          );
        `);

        // Migration for SQLite: Add user_id if missing
        database.run(`ALTER TABLE deliveries ADD COLUMN user_id INTEGER;`, () => {});
        database.run(`ALTER TABLE deliveries ADD COLUMN items_json TEXT;`, () => {});
        database.run(`ALTER TABLE expenses ADD COLUMN user_id INTEGER;`, () => {
          
          database.run(`
            CREATE TABLE IF NOT EXISTS vendors (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              contact_info TEXT,
              user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
            );
          `, () => {
            database.run(`
              CREATE TABLE IF NOT EXISTS inventory_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                sku TEXT,
                unit_of_measure TEXT,
                price REAL DEFAULT 0,
                general_stock_balance REAL DEFAULT 0,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
              );
            `, () => {
              database.run(`
                CREATE TABLE IF NOT EXISTS vendor_stocks (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
                  item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
                  quantity REAL DEFAULT 0
                );
              `, () => {
                database.run(`
                  CREATE TABLE IF NOT EXISTS stock_transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
                    vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
                    quantity_change REAL NOT NULL,
                    type TEXT NOT NULL,
                    reference_id INTEGER,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
                  );
                `, () => {
                  database.run(`ALTER TABLE deliveries ADD COLUMN vendor_id INTEGER;`, () => {});
                  database.run(`ALTER TABLE deliveries ADD COLUMN item_id INTEGER;`, () => {});
                  database.run(`ALTER TABLE inventory_items ADD COLUMN price REAL DEFAULT 0;`, () => {});
                  database.run(`ALTER TABLE deliveries ADD COLUMN quantity REAL DEFAULT 0;`, () => {
                    resolve();
                  });
                });
              });
            });
          });
        });
      });
    });
  }
}

module.exports = {
  query,
  execute,
  initDb,
  getUserId
};
