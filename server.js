// Polyfill crypto for older Node versions (Railway default is Node 16/18)
if (!globalThis.crypto) {
  globalThis.crypto = require("crypto").webcrypto;
}

const express = require("express");
const icalLib = require("ical-generator");
const ical = icalLib.default || icalLib;
const { Resend } = require("resend");
const bcrypt = require("bcrypt");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { pool, initDb } = require("./db");
const { teamPage } = require("./views/team");
const { loginPage } = require("./views/dashboard/login");
const { homePage } = require("./views/dashboard/home");
const { masterPage } = require("./views/dashboard/master");

const app = express();
const PORT = process.env.PORT || 3000;
const resend = new Resend(process.env.RESEND_API_KEY);

// Master admin key — used only for onboarding new teams via API
const MASTER_KEY = process.env.MASTER_KEY || "master-changeme";
const SESSION_SECRET = process.env.SESSION_SECRET || "changeme-session-secret";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  store: new pgSession({ pool, createTableIfMissing: true }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
}));

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

// Team public webpage
app.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  // Don't intercept reserved routes
  const reserved = ["admin", "calendar", "dashboard"];
  if (reserved.some(r => slug.startsWith(r))) return res.status(404).send("Not found");

  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE slug = $1", [slug]);
  if (!teams.length) return res.status(404).send("Team not found");

  const team = teams[0];
  const { rows: fixtures } = await pool.query(
    "SELECT * FROM fixtures WHERE team_id = $1 ORDER BY start_time ASC",
    [team.id]
  );

  const host = req.headers.host;
  const calendarUrl = `https://${host}/calendar/${slug}.ics`;

  res.setHeader("Content-Type", "text/html");
  res.send(teamPage(team, fixtures, calendarUrl));
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
  const { summary, location, description, start, end, homeTeam, awayTeam, isHome } = req.body;
  if (!start || !end || !homeTeam || !awayTeam) {
    return res.status(400).json({ error: "start, end, homeTeam and awayTeam are required" });
  }

  const uid = `${req.team.slug}-${Date.now()}@calendar.fixture-app.com`;
  const autoSummary = summary || `${homeTeam} vs ${awayTeam}`;

  const { rows } = await pool.query(
    `INSERT INTO fixtures (team_id, uid, summary, location, description, start_time, end_time, home_team, away_team, is_home)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [req.team.id, uid, autoSummary, location, description, start, end, homeTeam, awayTeam, isHome !== false]
  );

  res.json({ success: true, fixture: rows[0] });
});

// Update fixture details (home/away teams, location, description)
app.post("/admin/:slug/fixtures/:id/update", requireTeamKey, async (req, res) => {
  const { id } = req.params;
  const { homeTeam, awayTeam, isHome, location, description } = req.body;

  const { rows } = await pool.query(
    `UPDATE fixtures
     SET home_team  = COALESCE($1, home_team),
         away_team  = COALESCE($2, away_team),
         is_home    = COALESCE($3, is_home),
         location   = COALESCE($4, location),
         description = COALESCE($5, description),
         summary    = CASE WHEN $1 IS NOT NULL AND $2 IS NOT NULL THEN $1 || ' vs ' || $2 ELSE summary END,
         updated_at = NOW()
     WHERE id = $6 AND team_id = $7
     RETURNING *`,
    [homeTeam || null, awayTeam || null, isHome !== undefined ? isHome : null, location || null, description || null, id, req.team.id]
  );

  if (!rows.length) return res.status(404).json({ error: "Fixture not found" });
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
  const { rows } = await pool.query("SELECT id, name, slug, tier, created_at FROM teams ORDER BY created_at DESC");
  res.json(rows);
});

// Update a team's tier (master key required)
app.post("/admin/teams/:slug/tier", requireMasterKey, async (req, res) => {
  const { slug } = req.params;
  const { tier } = req.body;
  if (!["free", "standard", "pro"].includes(tier)) {
    return res.status(400).json({ error: "tier must be free, standard or pro" });
  }
  const { rows } = await pool.query(
    "UPDATE teams SET tier = $1 WHERE slug = $2 RETURNING id, name, slug, tier",
    [tier, slug]
  );
  if (!rows.length) return res.status(404).json({ error: "Team not found" });
  res.json({ success: true, team: rows[0] });
});

// Create a user account (master key required)
app.post("/admin/users", requireMasterKey, async (req, res) => {
  const { email, password, passwordHash, role, teamSlug } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  let hash = passwordHash;
  if (!hash) {
    if (!password) return res.status(400).json({ error: "password or passwordHash is required" });
    hash = await bcrypt.hash(password, 10);
  }

  let teamId = null;
  if (teamSlug) {
    const { rows } = await pool.query("SELECT id FROM teams WHERE slug = $1", [teamSlug]);
    if (!rows.length) return res.status(404).json({ error: "Team not found" });
    teamId = rows[0].id;
  }

  try {
    const { rows } = await pool.query(
      "INSERT INTO users (email, password_hash, team_id, role) VALUES ($1,$2,$3,$4) RETURNING id, email, role",
      [email.toLowerCase(), hash, teamId, role || "admin"]
    );
    res.json({ success: true, user: rows[0] });
  } catch(e) {
    if (e.code === "23505") return res.status(409).json({ error: "Email already exists" });
    throw e;
  }
});

// --- Dashboard routes ---

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect("/dashboard/login");
  next();
}

async function loadSessionUser(req, res, next) {
  if (req.session.userId) {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
    if (rows.length) req.user = rows[0];
  }
  next();
}

app.use(loadSessionUser);

// Login page
app.get("/dashboard/login", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.send(loginPage());
});

app.post("/dashboard/login", async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  if (!rows.length) return res.send(loginPage("Invalid email or password"));

  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) return res.send(loginPage("Invalid email or password"));

  req.session.userId = rows[0].id;
  res.redirect("/dashboard");
});

app.get("/dashboard/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/dashboard/login"));
});

// Main dashboard — fixtures
app.get("/dashboard", requireLogin, async (req, res) => {
  // Master users go straight to their own view unless viewing a specific team
  if (req.user.role === "master" && !req.query.teamId) return res.redirect("/dashboard/master");

  const teamId = req.user.role === "master" ? req.query.teamId : req.user.team_id;
  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE id = $1", [teamId]);
  const team = teams[0];
  if (!team) return res.redirect("/dashboard/master");

  const { rows: fixtures } = await pool.query(
    "SELECT * FROM fixtures WHERE team_id = $1 ORDER BY start_time ASC", [team.id]
  );
  const { rows: subscribers } = await pool.query(
    "SELECT * FROM subscribers WHERE team_id = $1", [team.id]
  );

  const flash = req.session.flash;
  delete req.session.flash;
  res.send(homePage(req.user, team, fixtures, subscribers, flash));
});

// Add fixture via dashboard
app.post("/dashboard/fixtures/add", requireLogin, async (req, res) => {
  const { homeTeam, awayTeam, isHome, start, end, location, description } = req.body;
  const teamId = req.user.team_id;
  const team = (await pool.query("SELECT * FROM teams WHERE id = $1", [teamId])).rows[0];

  const uid = `${team.slug}-${Date.now()}@calendar.fixture-app.com`;
  const summary = `${homeTeam} vs ${awayTeam}`;

  await pool.query(
    `INSERT INTO fixtures (team_id, uid, summary, location, description, start_time, end_time, home_team, away_team, is_home)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [teamId, uid, summary, location, description, start, end, homeTeam, awayTeam, isHome === "true"]
  );

  req.session.flash = { type: "success", msg: `Fixture added: ${summary}` };
  res.redirect("/dashboard");
});

// Reschedule fixture via dashboard
app.post("/dashboard/fixtures/reschedule", requireLogin, async (req, res) => {
  const { uid, newStart, newEnd, reason } = req.body;
  const teamId = req.user.team_id;
  const team = (await pool.query("SELECT * FROM teams WHERE id = $1", [teamId])).rows[0];

  const { rows: existing } = await pool.query(
    "SELECT * FROM fixtures WHERE uid = $1 AND team_id = $2", [uid, teamId]
  );
  if (!existing.length) { req.session.flash = { type: "error", msg: "Fixture not found" }; return res.redirect("/dashboard"); }

  const oldStart = existing[0].start_time;

  const { rows: updated } = await pool.query(
    `UPDATE fixtures SET start_time=$1, end_time=$2, sequence=sequence+1,
     description=CASE WHEN description NOT LIKE '%(RESCHEDULED)%' THEN description||' (RESCHEDULED)' ELSE description END,
     updated_at=NOW() WHERE uid=$3 AND team_id=$4 RETURNING *`,
    [newStart, newEnd, uid, teamId]
  );

  await sendRescheduleEmails(team, { ...updated[0], reason }, oldStart);
  req.session.flash = { type: "success", msg: `Fixture rescheduled. Subscribers notified.` };
  res.redirect("/dashboard");
});

// Subscribers page
app.get("/dashboard/subscribers", requireLogin, async (req, res) => {
  const { rows: subs } = await pool.query(
    "SELECT * FROM subscribers WHERE team_id = $1 ORDER BY created_at DESC", [req.user.team_id]
  );
  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE id = $1", [req.user.team_id]);
  const flash = req.session.flash; delete req.session.flash;

  const content = `
    ${flash ? `<div class="alert alert-${flash.type}">${flash.msg}</div>` : ""}
    <div class="page-header"><h1>Subscribers</h1><p>People receiving email notifications for your fixtures.</p></div>
    <div class="card">
      <div class="card-title">Add Subscriber</div>
      <form method="POST" action="/dashboard/subscribers/add" style="display:flex;gap:10px;align-items:flex-end">
        <div class="form-group" style="flex:1"><label>Email</label><input type="email" name="email" required placeholder="fan@example.com"></div>
        <button type="submit" class="btn btn-primary">Add</button>
      </form>
    </div>
    <div class="card">
      <div class="card-title">Subscribers (${subs.length})</div>
      ${subs.length ? `<table><thead><tr><th>Email</th><th>Joined</th><th></th></tr></thead><tbody>
        ${subs.map(s => `<tr><td>${s.email}</td><td style="color:#555">${new Date(s.created_at).toLocaleDateString("en-GB")}</td>
          <td><form method="POST" action="/dashboard/subscribers/remove"><input type="hidden" name="email" value="${s.email}">
          <button class="btn btn-secondary btn-sm">Remove</button></form></td></tr>`).join("")}
      </tbody></table>` : `<p style="color:#555;font-size:0.85rem">No subscribers yet.</p>`}
    </div>
  `;
  const { layout } = require("./views/dashboard/layout");
  res.send(layout("Subscribers", content, req.user));
});

app.post("/dashboard/subscribers/add", requireLogin, async (req, res) => {
  const { email } = req.body;
  try {
    await pool.query("INSERT INTO subscribers (team_id, email) VALUES ($1,$2)", [req.user.team_id, email]);
    req.session.flash = { type: "success", msg: `${email} added.` };
  } catch(e) {
    req.session.flash = { type: "error", msg: "Already subscribed." };
  }
  res.redirect("/dashboard/subscribers");
});

app.post("/dashboard/subscribers/remove", requireLogin, async (req, res) => {
  await pool.query("DELETE FROM subscribers WHERE team_id=$1 AND email=$2", [req.user.team_id, req.body.email]);
  req.session.flash = { type: "success", msg: "Subscriber removed." };
  res.redirect("/dashboard/subscribers");
});

// Calendar feed info page
app.get("/dashboard/feed", requireLogin, async (req, res) => {
  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE id = $1", [req.user.team_id]);
  const team = teams[0];
  const feedUrl = `https://${req.headers.host}/calendar/${team.slug}.ics`;
  const webcalUrl = feedUrl.replace("https://", "webcal://");
  const { layout } = require("./views/dashboard/layout");
  const content = `
    <div class="page-header"><h1>Calendar Feed</h1><p>Share these links with your fans.</p></div>
    <div class="card">
      <div class="card-title">Your Public Page</div>
      <p style="color:#aaa;font-size:0.85rem;margin-bottom:10px">Share this link with fans to see your fixtures.</p>
      <a href="/${team.slug}" target="_blank" class="btn btn-secondary">View Page →</a>
    </div>
    <div class="card">
      <div class="card-title">Calendar Subscription URL</div>
      <p style="color:#aaa;font-size:0.85rem;margin-bottom:10px">Fans paste this into Google Calendar, Outlook etc.</p>
      <code style="background:#111;padding:10px 14px;display:block;color:#cc0000;font-size:0.85rem;word-break:break-all;margin-bottom:10px">${feedUrl}</code>
      <a href="${webcalUrl}" class="btn btn-primary">📅 Subscribe (Apple/Outlook)</a>
    </div>
  `;
  res.send(layout("Calendar Feed", content, req.user));
});

// Master dashboard
app.get("/dashboard/master", requireLogin, async (req, res) => {
  if (req.user.role !== "master") return res.redirect("/dashboard");
  const { rows: teams } = await pool.query(`
    SELECT t.*,
      COUNT(DISTINCT f.id) AS fixture_count,
      COUNT(DISTINCT s.id) AS subscriber_count
    FROM teams t
    LEFT JOIN fixtures f ON f.team_id = t.id
    LEFT JOIN subscribers s ON s.team_id = t.id
    GROUP BY t.id ORDER BY t.created_at DESC
  `);
  res.send(masterPage(req.user, teams));
});

app.post("/dashboard/master/tier", requireLogin, async (req, res) => {
  if (req.user.role !== "master") return res.redirect("/dashboard");
  const { slug, tier } = req.body;
  await pool.query("UPDATE teams SET tier=$1 WHERE slug=$2", [tier, slug]);
  res.redirect("/dashboard/master");
});

// --- Start ---

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Fixture feed running on port ${PORT}`);
  });
});
