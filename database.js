const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

async function getDb() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

async function initDb() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS daily_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id INTEGER NOT NULL,
      count INTEGER NOT NULL,
      date DATE NOT NULL,
      FOREIGN KEY (offer_id) REFERENCES offers(id),
      UNIQUE(offer_id, date)
    );
  `);

  try {
    await db.exec('ALTER TABLE offers ADD COLUMN user_id INTEGER REFERENCES users(id)');
  } catch (e) {}
  
  try { await db.exec('ALTER TABLE offers ADD COLUMN site_url TEXT'); } catch(e) {}
  try { await db.exec('ALTER TABLE offers ADD COLUMN checkout_url TEXT'); } catch(e) {}
  try { await db.exec('ALTER TABLE offers ADD COLUMN tags TEXT'); } catch(e) {}
  try { await db.exec('ALTER TABLE offers ADD COLUMN idiomas TEXT'); } catch(e) {}

  // Novas colunas na tabela users
  try { await db.exec('ALTER TABLE users ADD COLUMN email TEXT'); } catch(e) {}
  try { await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL'); } catch(e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN last_login DATETIME'); } catch(e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0'); } catch(e) {}
  try { await db.exec('ALTER TABLE users ADD COLUMN has_seen_onboarding BOOLEAN DEFAULT 0'); } catch(e) {}
  
  // Transformar o usuário 1 em admin por padrão
  try { await db.exec('UPDATE users SET is_admin = 1 WHERE id = 1'); } catch(e) {}

  return db;
}

module.exports = { getDb, initDb };
