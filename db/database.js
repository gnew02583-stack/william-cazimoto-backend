// db/database.js
// Base de dados local em ficheiro (SQLite) — não precisa de servidor
// de base de dados separado. Ideal para começar; mais tarde pode
// migrar-se para PostgreSQL/MySQL sem mudar muito a lógica.

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// --- Tabela de utilizadores ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// --- Tabela de pagamentos M-Pesa ---
db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    plan TEXT NOT NULL,
    phone TEXT NOT NULL,
    amount REAL NOT NULL,
    transaction_reference TEXT NOT NULL UNIQUE,
    mpesa_conversation_id TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    raw_response TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`);

module.exports = db;
