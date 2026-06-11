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
      ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS home_venue VARCHAR(200),
      ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(300),
      ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(300),
      ADD COLUMN IF NOT EXISTS tiktok_url VARCHAR(300),
      ADD COLUMN IF NOT EXISTS theme VARCHAR(10) DEFAULT 'dark';

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

  await pool.query(`
    ALTER TABLE fixtures
      ADD COLUMN IF NOT EXISTS fixture_type VARCHAR(20) DEFAULT 'league';
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

  // Event model: fixtures table holds all event kinds (fixture, training, meeting, social, duty).
  // recurrence_group ties together a weekly series created in one go.
  await pool.query(`
    ALTER TABLE fixtures
      ADD COLUMN IF NOT EXISTS event_kind VARCHAR(20) DEFAULT 'fixture',
      ADD COLUMN IF NOT EXISTS recurrence_group VARCHAR(80),
      ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;
  `);

  // Roles: owner (club creator), manager (fixtures+comms), coach (fixtures only), master (platform).
  // Legacy 'admin' rows become owners — safe to re-run because nothing creates 'admin' anymore.
  await pool.query(`UPDATE users SET role='owner' WHERE role='admin';`);

  // Pending invitations to join a club's dashboard
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invites (
      id          SERIAL PRIMARY KEY,
      team_id     INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      email       VARCHAR(200) NOT NULL,
      role        VARCHAR(20) NOT NULL DEFAULT 'coach',
      token       VARCHAR(80) UNIQUE NOT NULL,
      invited_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at  TIMESTAMP DEFAULT NOW(),
      accepted_at TIMESTAMP
    );
  `);

  // Announcement broadcasts from club to subscribers (log retained for auditability)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id         SERIAL PRIMARY KEY,
      team_id    INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      subject    VARCHAR(200) NOT NULL,
      body       TEXT NOT NULL,
      sent_to    INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // RSVP / availability responses (one row per person per event)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS availability (
      id          SERIAL PRIMARY KEY,
      fixture_id  INTEGER REFERENCES fixtures(id) ON DELETE CASCADE,
      email       VARCHAR(200) NOT NULL,
      fan_user_id INTEGER REFERENCES fan_users(id) ON DELETE SET NULL,
      status      VARCHAR(10) NOT NULL,
      note        VARCHAR(300),
      updated_at  TIMESTAMP DEFAULT NOW(),
      UNIQUE(fixture_id, email)
    );
  `);

  console.log("Database ready");
}

module.exports = { pool, initDb };
