// Polyfill crypto for older Node versions (Railway default is Node 16/18)
if (!globalThis.crypto) {
  globalThis.crypto = require("crypto").webcrypto;
}

const express = require("express");
const icalLib = require("ical-generator");
const ical = icalLib.default || icalLib;
const { Resend } = require("resend");
const { pool, initDb } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const resend = new Resend(process.env.RESEND_API_KEY);

// Master admin key — used only for onboarding new teams
const MASTER_KEY = process.env.MASTER_KEY || "master-changeme";

app.use(express.json());

// --- Middleware ---

// Validates the master admin key (used for creating teams)
function requireMasterKey(req, res, next) {
  if (req.headers["x-admin-key"] !== MASTER_KEY) {
    return res.status(401).json({ error: "Unauthorised" });
  }
  next();
}

// Validates a team-specific admin key
async function requireTeamKey(req, res, next) {
  const { slug } = req.params;
  const { rows } = await pool.query("SELECT * FROM teams WHERE slug = $1", [slug]);
  if (!rows.length) return res.status(404).json({ error: `Team not found: ${slug}` });

  const team = rows[0];
  if (req.headers["x-admin-key"] !== team.admin_key) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  req.team = team;
  next();
}

// --- Helpers ---

const fmt = iso => new Date(iso).toUTCString().replace(" GMT", " UTC");

async function sendRescheduleEmails(team, fixture, oldStart) {
  const { rows: subs } = await pool.query(
    "SELECT email FROM subscribers WHERE team_id = $1",
    [team.id]
  );
  if (!subs.length) return 0;

  const emails = subs.map(s => s.email);

  await resend.emails.send({
    from: "Fixture Updates <onboarding@resend.dev>",
    to: emails,
    subject: `Fixture Rescheduled: ${fixture.summary}`,
    html: `
      <h2>Fixture Rescheduled</h2>
      <p><strong>${fixture.summary}</strong> has been moved.</p>
      <table style="border-collapse:collapse;font-family:sans-serif">
        <tr>
          <td style="padding:8px;color:#666">Was:</td>
          <td style="padding:8px"><s>${fmt(oldStart)}</s></td>
        </tr>
        <tr>
          <td style="padding:8px;color:#666">Now:</td>
          <td style="padding:8px"><strong>${fmt(fixture.start_time)}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px;color:#666">Venue:</td>
          <td style="padding:8px">${fixture.location}</td>
        </tr>
        ${fixture.reason ? `<tr><td style="padding:8px;color:#666">Reason:</td><td style="padding:8px">${fixture.reason}</td></tr>` : ""}
      </table>
      <p style="color:#666;font-size:12px">Your calendar will update automatically. No action needed.</p>
    `,
  });

  return emails.length;
}

// --- Routes ---

// Health check
app.get("/", (req, res) => {
  res.send("Fixture calendar service is running.");
});

// --- Calendar feed (public) ---

app.get("/calendar/:slug.ics", async (req, res) => {
  const { slug } = req.params;

  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE slug = $1", [slug]);
  if (!teams.length) return res.status(404).send("Team not found");

  const team = teams[0];
  const { rows: fixtures } = await pool.query(
    "SELECT * FROM fixtures WHERE team_id = $1 ORDER BY start_time ASC",
    [team.id]
  );

  const calendar = ical({
    name: `${team.name} Fixtures`,
    description: `Live fixture schedule for ${team.name}`,
    prodId: { company: "FixtureApp", product: "Sports Calendar", language: "EN" },
    ttl: 1800,
  });

  for (const fixture of fixtures) {
    const event = calendar.createEvent({
      sequence: fixture.sequence,
      summary: fixture.summary,
      description: fixture.description,
      location: fixture.location,
      start: new Date(fixture.start_time),
      end: new Date(fixture.end_time),
    });
    event.uid(fixture.uid);
  }

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(calendar.toString());
});

// --- Team admin routes (team admin key required) ---

// Add a fixture
app.post("/admin/:slug/fixtures", requireTeamKey, async (req, res) => {
  const { summary, location, description, start, end } = req.body;
  if (!summary || !start || !end) {
    return res.status(400).json({ error: "summary, start and end are required" });
  }

  const uid = `${req.team.slug}-${Date.now()}@calendar.fixture-app.com`;

  const { rows } = await pool.query(
    `INSERT INTO fixtures (team_id, uid, summary, location, description, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.team.id, uid, summary, location, description, start, end]
  );

  res.json({ success: true, fixture: rows[0] });
});

// Reschedule a fixture + email subscribers
app.post("/admin/:slug/reschedule", requireTeamKey, async (req, res) => {
  const { uid, newStart, newEnd, reason } = req.body;
  if (!uid || !newStart || !newEnd) {
    return res.status(400).json({ error: "uid, newStart and newEnd are required" });
  }

  const { rows } = await pool.query(
    "SELECT * FROM fixtures WHERE uid = $1 AND team_id = $2",
    [uid, req.team.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Fixture not found" });

  const oldStart = rows[0].start_time;

  const { rows: updated } = await pool.query(
    `UPDATE fixtures
     SET start_time = $1, end_time = $2, sequence = sequence + 1,
         description = CASE WHEN description NOT LIKE '%(RESCHEDULED)%'
                       THEN description || ' (RESCHEDULED)' ELSE description END,
         updated_at = NOW()
     WHERE uid = $3 AND team_id = $4
     RETURNING *`,
    [newStart, newEnd, uid, req.team.id]
  );

  const fixture = { ...updated[0], reason };
  const emailsSent = await sendRescheduleEmails(req.team, fixture, oldStart);

  res.json({ success: true, fixture: updated[0], emailsSent });
});

// Add a subscriber
app.post("/admin/:slug/subscribers", requireTeamKey, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  try {
    const { rows } = await pool.query(
      "INSERT INTO subscribers (team_id, email) VALUES ($1, $2) RETURNING *",
      [req.team.id, email]
    );
    res.json({ success: true, subscriber: rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Already subscribed" });
    throw err;
  }
});

// --- Master admin routes (master key required) ---

// Onboard a new team
app.post("/admin/teams", requireMasterKey, async (req, res) => {
  const { name, slug, adminKey } = req.body;
  if (!name || !slug || !adminKey) {
    return res.status(400).json({ error: "name, slug and adminKey are required" });
  }

  try {
    const { rows } = await pool.query(
      "INSERT INTO teams (name, slug, admin_key) VALUES ($1, $2, $3) RETURNING *",
      [name, slug, adminKey]
    );
    res.json({
      success: true,
      team: rows[0],
      calendarUrl: `https://fixture-app-production.up.railway.app/calendar/${slug}.ics`,
    });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Slug already exists" });
    throw err;
  }
});

// List all teams (master key required)
app.get("/admin/teams", requireMasterKey, async (req, res) => {
  const { rows } = await pool.query("SELECT id, name, slug, created_at FROM teams ORDER BY created_at DESC");
  res.json(rows);
});

// --- Start ---

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Fixture feed running on port ${PORT}`);
  });
});
