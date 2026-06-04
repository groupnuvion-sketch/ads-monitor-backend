const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

function replaceParams(sql) {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
}

const dbAdapter = {
  async run(sql, params = []) {
    let modifiedSql = replaceParams(sql);
    if (modifiedSql.trim().toUpperCase().startsWith('INSERT') && !modifiedSql.toUpperCase().includes('RETURNING')) {
      modifiedSql += ' RETURNING id';
    }
    const res = await pool.query(modifiedSql, params);
    const lastID = (res.rows && res.rows[0] && res.rows[0].id) ? res.rows[0].id : null;
    return { lastID, changes: res.rowCount };
  },
  async get(sql, params = []) {
    const res = await pool.query(replaceParams(sql), params);
    return res.rows[0];
  },
  async all(sql, params = []) {
    const res = await pool.query(replaceParams(sql), params);
    return res.rows;
  },
  async exec(sql) {
    return await pool.query(sql);
  }
};

async function getDb() {
  return dbAdapter;
}

async function initDb() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE,
      last_login TIMESTAMP,
      is_admin BOOLEAN DEFAULT FALSE,
      has_seen_onboarding BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS offers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      site_url TEXT,
      checkout_url TEXT,
      tags TEXT,
      idiomas TEXT,
      oldest_ad_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_counts (
      id SERIAL PRIMARY KEY,
      offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
      count INTEGER NOT NULL,
      date DATE NOT NULL,
      UNIQUE(offer_id, date)
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      token VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    await db.exec('ALTER TABLE offers ADD COLUMN oldest_ad_date DATE;');
  } catch(e) {}

  try {
    await db.exec('ALTER TABLE users ADD COLUMN parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE;');
  } catch(e) {}

  try { await db.exec("UPDATE users SET is_admin = TRUE WHERE id = 1"); } catch(e) {}

  return db;
}

module.exports = { getDb, initDb };
