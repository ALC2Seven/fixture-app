const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Create all tables if they don't exist, then run migrations
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id        SERIAL PRIMARY KEY,
      slug      VARCHAR(50)  UNIQUE NOT NULL,
      name      VARCHAR(100) NOT NULL,
      admin_key VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fixtures (
      id          SERIAL PRIMARY KEY,
      team_id     INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      uid         VARCHAR(200) UNIQUE NOT NULL,
      sequence    INTEGER DEFAULT 0,
      summary     VARCHAR(200) NOT NULL,
      location    VARCHAR(200),
      description TEXT,
      start_time  TIMESTAMP NOT NULL,
      end_time    TIMESTAMP NOT NULL,
      created_at  TIMESTAMP DEFAULT NOW(),
      updated_at  TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id         SERIAL PRIMARY KEY,
      team_id    INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      email      VARCHAR(200) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(team_id, email)
    );
  `);

  // Migrations — safe to run repeatedly (ADD COLUMN IF NOT EXISTS)
  await pool.query(`
    ALTER TABLE teams
      ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'free';

    ALTER TABLE fixtures
      ADD COLUMN IF NOT EXISTS home_team VARCHAR(100),
      ADD COLUMN IF NOT EXISTS away_team VARCHAR(100),
      ADD COLUMN IF NOT EXISTS is_home   BOOLEAN DEFAULT true;
  `);

  // Users table for dashboard login
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         VARCHAR(200) UNIQUE NOT NULL,
      password_hash VARCHAR(200) NOT NULL,
      team_id       INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      role          VARCHAR(20) DEFAULT 'admin',
      created_at    TIMESTAMP DEFAULT NOW()
    );
  `);

  // Add status column to fixtures if it doesn't exist
  await pool.query(`
    ALTER TABLE fixtures
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
  `);

  // Fan user accounts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fan_users (
      id            SERIAL PRIMARY KEY,
      email         VARCHAR(200) UNIQUE NOT NULL,
      password_hash VARCHAR(200) NOT NULL,
      created_at    TIMESTAMP DEFAULT NOW()
    );
  `);

  // Link anonymous subscribers to fan accounts
  await pool.query(`
    ALTER TABLE subscribers
      ADD COLUMN IF NOT EXISTS fan_user_id INTEGER REFERENCES fan_users(id) ON DELETE SET NULL;
  `);

  console.log("Database ready");
}

module.exports = { pool, initDb };
