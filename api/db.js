// Load environment variables from .env file locally
require('dotenv').config();

const { Pool } = require('pg');

let db = null;
let isPostgres = true;

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (connectionString) {
  db = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // Local fallback to SQLite if connection string is missing
  isPostgres = false;
  try {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const dbPath = path.resolve(process.cwd(), 'reporting.db');
    db = new sqlite3.Database(dbPath);
  } catch (err) {
    console.error('Failed to load SQLite:', err);
  }
}

// Helper to run query and return rows
async function query(text, params) {
  if (isPostgres) {
    const res = await db.query(text, params);
    return res.rows;
  } else {
    return new Promise((resolve, reject) => {
      const sqliteText = text.replace(/\$\d+/g, () => '?');
      db.all(sqliteText, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

// Helper for INSERT / UPDATE / DELETE that returns info
async function execute(text, params) {
  if (isPostgres) {
    const res = await db.query(text, params);
    return res;
  } else {
    return new Promise((resolve, reject) => {
      const sqliteText = text.replace(/\$\d+/g, () => '?');
      db.run(sqliteText, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
}

// Initialize tables
async function initDb() {
  if (isPostgres) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id SERIAL PRIMARY KEY,
        date VARCHAR(20) NOT NULL,
        location VARCHAR(255) NOT NULL,
        rider VARCHAR(255) NOT NULL,
        product VARCHAR(255) NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        fee NUMERIC(12, 2) NOT NULL
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        date VARCHAR(20) NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL
      );
    `);
  } else if (db) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS deliveries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            location TEXT NOT NULL,
            rider TEXT NOT NULL,
            product TEXT NOT NULL,
            price REAL NOT NULL,
            fee REAL NOT NULL
          );
        `, (err) => { if (err) reject(err); });
        db.run(`
          CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL
          );
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }
}

module.exports = {
  query,
  execute,
  initDb,
  isPostgres
};
