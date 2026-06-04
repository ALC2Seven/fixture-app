const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Create all tables if they don't exist
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
  console.log("Database ready");
}

module.exports = { pool, initDb };
