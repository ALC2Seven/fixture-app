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
const multer = require("multer");
const { teamPage } = require("./views/team");
const { loginPage } = require("./views/dashboard/login");
const { homePage } = require("./views/dashboard/home");
const { masterPage } = require("./views/dashboard/master");
const { homepagePage } = require("./views/marketing/home");
const { pricingPage } = require("./views/marketing/pricing");
const { signupPage } = require("./views/marketing/signup");
const { generateTemplate, parseFixtures } = require("./utils/fixtureImport");
const { fanSignupPage } = require("./views/fan/signup");
const { fanLoginPage }  = require("./views/fan/login");
const { fanDashboardPage } = require("./views/fan/dashboard");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

async function getSubscriberEmails(teamId) {
  const { rows } = await pool.query("SELECT email FROM subscribers WHERE team_id = $1", [teamId]);
  return rows.map(r => r.email);
}

async function sendCancellationEmails(team, fixture, cancelType) {
  const emails = await getSubscriberEmails(team.id);
  if (!emails.length) return 0;
  const shown = cancelType === "shown";
  await resend.emails.send({
    from: "Fixture Updates <onboarding@resend.dev>",
    to: emails,
    subject: `Fixture Cancelled: ${fixture.summary}`,
    html: `
      <h2>Fixture Cancelled</h2>
      <p><strong>${fixture.summary}</strong> scheduled for <strong>${fmt(fixture.start_time)}</strong> has been cancelled.</p>
      ${shown
        ? `<p style="color:#666">The fixture will remain visible on the fixtures page marked as cancelled.</p>`
        : `<p style="color:#666">The fixture has been removed from the fixtures page and your calendar.</p>`}
      <p style="color:#666;font-size:12px">Your calendar will update automatically. No action needed.</p>
    `,
  });
  return emails.length;
}

async function sendVenueChangeEmails(team, fixture, oldVenue) {
  const emails = await getSubscriberEmails(team.id);
  if (!emails.length) return 0;
  await resend.emails.send({
    from: "Fixture Updates <onboarding@resend.dev>",
    to: emails,
    subject: `Venue Changed: ${fixture.summary}`,
    html: `
      <h2>Venue Change</h2>
      <p>The venue for <strong>${fixture.summary}</strong> on <strong>${fmt(fixture.start_time)}</strong> has changed.</p>
      <table style="border-collapse:collapse;font-family:sans-serif">
        <tr>
          <td style="padding:8px;color:#666">Was:</td>
          <td style="padding:8px"><s>${oldVenue || "TBC"}</s></td>
        </tr>
        <tr>
          <td style="padding:8px;color:#666">Now:</td>
          <td style="padding:8px"><strong>${fixture.location || "TBC"}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px;color:#666">Date:</td>
          <td style="padding:8px">${fmt(fixture.start_time)}</td>
        </tr>
      </table>
      <p style="color:#666;font-size:12px">Your calendar invite has been updated automatically.</p>
    `,
  });
  return emails.length;
}

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

// --- Marketing pages ---

app.get("/", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.send(homepagePage());
});

app.get("/pricing", (req, res) => {
  res.send(pricingPage());
});

// Signup
app.get("/signup", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.send(signupPage());
});

const RESERVED_SLUGS = ["dashboard", "admin", "calendar", "pricing", "signup", "login", "logout"];

app.post("/signup", async (req, res) => {
  const { clubName, slug, email, password, homeVenue } = req.body;
  const prefill = { clubName, slug, email, homeVenue };

  // Basic validation
  if (!clubName || !slug || !email || !password) {
    return res.send(signupPage("Please fill in all fields.", prefill));
  }
  if (password.length < 8) {
    return res.send(signupPage("Password must be at least 8 characters.", prefill));
  }
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!cleanSlug || cleanSlug !== slug) {
    return res.send(signupPage("URL can only contain lowercase letters, numbers and hyphens.", prefill));
  }
  if (RESERVED_SLUGS.includes(cleanSlug)) {
    return res.send(signupPage("That URL is reserved — please choose another.", prefill));
  }

  try {
    // Create team
    const { rows: teamRows } = await pool.query(
      "INSERT INTO teams (name, slug, admin_key, tier, home_venue) VALUES ($1, $2, $3, 'free', $4) RETURNING *",
      [clubName.trim(), cleanSlug, `key-${cleanSlug}-${Date.now()}`, homeVenue?.trim() || null]
    );
    const team = teamRows[0];

    // Create user
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows: userRows } = await pool.query(
      "INSERT INTO users (email, password_hash, team_id, role) VALUES ($1, $2, $3, 'admin') RETURNING *",
      [email.toLowerCase().trim(), passwordHash, team.id]
    );
    const user = userRows[0];

    // Log them in
    req.session.userId = user.id;
    res.redirect("/dashboard");

  } catch (err) {
    if (err.code === "23505") {
      const msg = err.detail && err.detail.includes("slug")
        ? "That club URL is already taken — please choose another."
        : "An account with that email already exists.";
      return res.send(signupPage(msg, prefill));
    }
    console.error("Signup error:", err);
    return res.send(signupPage("Something went wrong — please try again.", prefill));
  }
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
    const cancelled = fixture.status === "cancelled_hidden" || fixture.status === "cancelled_shown";
    const event = calendar.createEvent({
      sequence: fixture.sequence,
      summary: cancelled ? `CANCELLED: ${fixture.summary}` : fixture.summary,
      description: fixture.description,
      location: fixture.location,
      start: new Date(fixture.start_time),
      end: new Date(fixture.end_time),
      status: cancelled ? "CANCELLED" : "CONFIRMED",
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
  if (req.session.fanUserId) {
    const { rows } = await pool.query("SELECT * FROM fan_users WHERE id = $1", [req.session.fanUserId]);
    if (rows.length) req.fanUser = rows[0];
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
  res.send(homePage(req.user, team, fixtures, subscribers, flash, team.home_venue));
});

// Download fixture template
app.get("/dashboard/fixtures/template", requireLogin, async (req, res) => {
  const { rows } = await pool.query("SELECT name FROM teams WHERE id = $1", [req.user.team_id]);
  const teamName = rows[0]?.name || "Your Team";
  const buffer = await generateTemplate(teamName);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="fixture-template-${teamName.toLowerCase().replace(/\s+/g,"-")}.xlsx"`);
  res.send(buffer);
});

// Upload fixtures from Excel/CSV
app.post("/dashboard/fixtures/upload", requireLogin, upload.single("file"), async (req, res) => {
  if (!req.file) {
    req.session.flash = { type: "error", msg: "No file uploaded." };
    return res.redirect("/dashboard");
  }

  const { rows: teamRows } = await pool.query("SELECT * FROM teams WHERE id = $1", [req.user.team_id]);
  const team = teamRows[0];

  const { fixtures, errors } = await parseFixtures(req.file.buffer, req.file.mimetype, team.name);

  if (!fixtures.length && errors.length) {
    req.session.flash = { type: "error", msg: `Import failed: ${errors.join(" | ")}` };
    return res.redirect("/dashboard");
  }

  // Insert all valid fixtures, skipping duplicates
  let imported = 0;
  let skippedDupes = 0;
  for (const f of fixtures) {
    // Check for duplicate: same team, same start time, same opponent
    const { rows: existing } = await pool.query(
      `SELECT id FROM fixtures
       WHERE team_id = $1
         AND start_time = $2
         AND (home_team = $3 OR away_team = $3)`,
      [team.id, f.start, f.isHome ? f.awayTeam : f.homeTeam]
    );

    if (existing.length) {
      skippedDupes++;
      continue;
    }

    const uid = `${team.slug}-${Date.now()}-${imported}@calendar.fixture-app.com`;
    await pool.query(
      `INSERT INTO fixtures (team_id, uid, summary, location, description, start_time, end_time, home_team, away_team, is_home)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [team.id, uid, f.summary, f.location, f.description, f.start, f.end || f.start, f.homeTeam, f.awayTeam, f.isHome]
    );
    imported++;
  }

  const parts = [];
  if (imported)      parts.push(`${imported} fixture${imported !== 1 ? "s" : ""} imported`);
  if (skippedDupes)  parts.push(`${skippedDupes} duplicate${skippedDupes !== 1 ? "s" : ""} skipped`);
  if (errors.length) parts.push(`${errors.length} row${errors.length !== 1 ? "s" : ""} had errors`);
  const msg = parts.join(", ") + ".";

  req.session.flash = { type: "success", msg };
  res.redirect("/dashboard");
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

// Change opponent via dashboard
app.post("/dashboard/fixtures/change-opponent", requireLogin, async (req, res) => {
  const { uid, opponentName, isHome } = req.body;
  const teamId = req.user.team_id;

  // Get the club's own name
  const { rows: teamRows } = await pool.query("SELECT name FROM teams WHERE id = $1", [teamId]);
  const clubName = teamRows[0].name;

  // isHome tells us which slot is the club and which is the opponent
  const homeTeam = isHome === "true" ? clubName : opponentName;
  const awayTeam = isHome === "true" ? opponentName : clubName;

  const { rows } = await pool.query(
    `UPDATE fixtures SET home_team=$1, away_team=$2, summary=$3, sequence=sequence+1, updated_at=NOW()
     WHERE uid=$4 AND team_id=$5 RETURNING *`,
    [homeTeam, awayTeam, `${homeTeam} vs ${awayTeam}`, uid, teamId]
  );

  if (!rows.length) { req.session.flash = { type: "error", msg: "Fixture not found" }; return res.redirect("/dashboard"); }
  req.session.flash = { type: "success", msg: `Opponent changed to ${opponentName}` };
  res.redirect("/dashboard");
});

// Switch home/away
app.post("/dashboard/fixtures/switch-home-away", requireLogin, async (req, res) => {
  const { uid } = req.body;
  const teamId = req.user.team_id;

  // Get club name to determine current position
  const { rows: teamRows } = await pool.query("SELECT name FROM teams WHERE id = $1", [teamId]);
  const clubName = teamRows[0].name;

  // Get current fixture
  const { rows: current } = await pool.query("SELECT * FROM fixtures WHERE uid=$1 AND team_id=$2", [uid, teamId]);
  if (!current.length) { req.session.flash = { type: "error", msg: "Fixture not found" }; return res.redirect("/dashboard"); }

  const f = current[0];
  const isActuallyHome = f.home_team === clubName;

  // Swap: if currently home, make away (club moves to away_team slot)
  const newHomeTeam = isActuallyHome ? f.away_team : clubName;
  const newAwayTeam = isActuallyHome ? clubName : f.home_team;
  const newIsHome   = !isActuallyHome;

  const newSummary = `${newHomeTeam} vs ${newAwayTeam}`;
  const { rows } = await pool.query(
    `UPDATE fixtures
     SET is_home = $1,
         home_team = $2,
         away_team = $3,
         summary = $4,
         sequence = sequence + 1,
         updated_at = NOW()
     WHERE uid=$5 AND team_id=$6 RETURNING *`,
    [newIsHome, newHomeTeam, newAwayTeam, newSummary, uid, teamId]
  );

  if (!rows.length) { req.session.flash = { type: "error", msg: "Fixture not found" }; return res.redirect("/dashboard"); }
  req.session.flash = { type: "success", msg: `Switched to ${newIsHome ? "Home" : "Away"} fixture.` };
  res.redirect("/dashboard");
});

// Cancel fixture via dashboard
app.post("/dashboard/fixtures/cancel", requireLogin, async (req, res) => {
  const { uid, cancelType } = req.body; // cancelType: 'hidden' or 'shown'
  const teamId = req.user.team_id;
  const status = cancelType === "shown" ? "cancelled_shown" : "cancelled_hidden";

  const { rows } = await pool.query(
    `UPDATE fixtures SET status=$1, sequence=sequence+1, updated_at=NOW()
     WHERE uid=$2 AND team_id=$3 RETURNING *`,
    [status, uid, teamId]
  );

  if (!rows.length) { req.session.flash = { type: "error", msg: "Fixture not found" }; return res.redirect("/dashboard"); }

  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE id=$1", [teamId]);
  const emailsSent = await sendCancellationEmails(teams[0], rows[0], cancelType);

  const msg = cancelType === "shown"
    ? `Fixture marked as cancelled.${emailsSent ? ` ${emailsSent} subscriber(s) notified.` : ""}`
    : `Fixture cancelled and hidden.${emailsSent ? ` ${emailsSent} subscriber(s) notified.` : ""}`;
  req.session.flash = { type: "success", msg };
  res.redirect("/dashboard");
});

// Edit fixture (opponent, home/away, venue, description)
app.post("/dashboard/fixtures/edit", requireLogin, async (req, res) => {
  const { uid, opponent, isHome, location, description } = req.body;
  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE id = $1", [req.user.team_id]);
  const teamName = teams[0].name;

  // Fetch current fixture to detect venue change
  const { rows: existing } = await pool.query("SELECT * FROM fixtures WHERE uid=$1 AND team_id=$2", [uid, req.user.team_id]);
  if (!existing.length) { req.session.flash = { type: "error", msg: "Fixture not found." }; return res.redirect("/dashboard"); }
  const oldVenue = existing[0].location;

  const home = isHome === "true";
  const homeTeam = home ? teamName : opponent;
  const awayTeam = home ? opponent : teamName;
  const summary  = `${homeTeam} vs ${awayTeam}`;
  const newVenue = location || null;
  const venueChanged = (oldVenue || "") !== (newVenue || "");

  await pool.query(
    `UPDATE fixtures
     SET summary=$1, home_team=$2, away_team=$3, is_home=$4,
         location=$5, description=$6, sequence=sequence+1, updated_at=NOW()
     WHERE uid=$7 AND team_id=$8`,
    [summary, homeTeam, awayTeam, home, newVenue, description || null, uid, req.user.team_id]
  );

  let emailsSent = 0;
  if (venueChanged && newVenue) {
    const { rows: updated } = await pool.query("SELECT * FROM fixtures WHERE uid=$1", [uid]);
    emailsSent = await sendVenueChangeEmails(teams[0], updated[0], oldVenue);
  }

  const msg = `Fixture updated.${emailsSent ? ` ${emailsSent} subscriber(s) notified of venue change.` : ""}`;
  req.session.flash = { type: "success", msg };
  res.redirect("/dashboard");
});

// Restore a cancelled fixture
app.post("/dashboard/fixtures/restore", requireLogin, async (req, res) => {
  const { uid } = req.body;
  await pool.query(
    `UPDATE fixtures SET status='active', sequence=sequence+1, updated_at=NOW() WHERE uid=$1 AND team_id=$2`,
    [uid, req.user.team_id]
  );
  req.session.flash = { type: "success", msg: "Fixture restored." };
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

const { settingsPage } = require("./views/dashboard/settings");

app.get("/dashboard/settings", requireLogin, async (req, res) => {
  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE id = $1", [req.user.team_id]);
  const flash = req.session.flash; delete req.session.flash;
  res.send(settingsPage(req.user, teams[0], flash));
});

// Update club name
app.post("/dashboard/settings/club", requireLogin, async (req, res) => {
  const { clubName } = req.body;
  if (!clubName?.trim()) { req.session.flash = { type: "error", msg: "Club name cannot be empty." }; return res.redirect("/dashboard/settings"); }
  await pool.query("UPDATE teams SET name=$1 WHERE id=$2", [clubName.trim(), req.user.team_id]);
  req.session.flash = { type: "success", msg: "Club name updated." };
  res.redirect("/dashboard/settings");
});

// Update home venue
app.post("/dashboard/settings/home-venue", requireLogin, async (req, res) => {
  const { homeVenue, applyToAll } = req.body;
  const venue = homeVenue?.trim() || null;
  await pool.query("UPDATE teams SET home_venue=$1 WHERE id=$2", [venue, req.user.team_id]);
  if (applyToAll && venue) {
    await pool.query(
      "UPDATE fixtures SET location=$1 WHERE team_id=$2 AND is_home=true",
      [venue, req.user.team_id]
    );
  }
  const msg = applyToAll && venue
    ? "Home venue updated and applied to all home fixtures."
    : "Home venue updated.";
  req.session.flash = { type: "success", msg };
  res.redirect("/dashboard/settings");
});

// Update email
app.post("/dashboard/settings/email", requireLogin, async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) { req.session.flash = { type: "error", msg: "Email cannot be empty." }; return res.redirect("/dashboard/settings"); }
  try {
    await pool.query("UPDATE users SET email=$1 WHERE id=$2", [email.toLowerCase().trim(), req.user.id]);
    req.session.flash = { type: "success", msg: "Email updated." };
  } catch (e) {
    req.session.flash = { type: "error", msg: "That email is already in use." };
  }
  res.redirect("/dashboard/settings");
});

// Change password
app.post("/dashboard/settings/password", requireLogin, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (newPassword !== confirmPassword) { req.session.flash = { type: "error", msg: "New passwords do not match." }; return res.redirect("/dashboard/settings"); }
  if (newPassword.length < 8) { req.session.flash = { type: "error", msg: "Password must be at least 8 characters." }; return res.redirect("/dashboard/settings"); }
  const { rows } = await pool.query("SELECT password_hash FROM users WHERE id=$1", [req.user.id]);
  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) { req.session.flash = { type: "error", msg: "Current password is incorrect." }; return res.redirect("/dashboard/settings"); }
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, req.user.id]);
  req.session.flash = { type: "success", msg: "Password changed successfully." };
  res.redirect("/dashboard/settings");
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

// ---- Fan account routes ----

app.get("/fan/signup", (req, res) => {
  if (req.fanUser) return res.redirect("/my-teams");
  res.send(fanSignupPage(null, req.query.returnTo));
});

app.post("/fan/signup", async (req, res) => {
  const { email, password, confirm, returnTo } = req.body;
  if (password !== confirm) return res.send(fanSignupPage("Passwords do not match.", returnTo));
  if (password.length < 8) return res.send(fanSignupPage("Password must be at least 8 characters.", returnTo));
  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      "INSERT INTO fan_users (email, password_hash) VALUES ($1,$2) RETURNING *",
      [email.toLowerCase(), hash]
    );
    req.session.fanUserId = rows[0].id;
    res.redirect(returnTo || "/my-teams");
  } catch (e) {
    if (e.code === "23505") return res.send(fanSignupPage("An account with that email already exists.", returnTo));
    throw e;
  }
});

app.get("/fan/login", (req, res) => {
  if (req.fanUser) return res.redirect("/my-teams");
  res.send(fanLoginPage(null, req.query.returnTo));
});

app.post("/fan/login", async (req, res) => {
  const { email, password, returnTo } = req.body;
  const { rows } = await pool.query("SELECT * FROM fan_users WHERE email = $1", [email.toLowerCase()]);
  if (!rows.length) return res.send(fanLoginPage("Invalid email or password.", returnTo));
  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) return res.send(fanLoginPage("Invalid email or password.", returnTo));
  req.session.fanUserId = rows[0].id;
  res.redirect(returnTo || "/my-teams");
});

app.get("/fan/logout", (req, res) => {
  delete req.session.fanUserId;
  res.redirect("/");
});

// My Teams dashboard
app.get("/my-teams", async (req, res) => {
  if (!req.fanUser) return res.redirect("/fan/login");
  const { rows } = await pool.query(`
    SELECT s.*, t.name AS team_name, t.slug AS team_slug, t.tier
    FROM subscribers s
    JOIN teams t ON t.id = s.team_id
    WHERE s.fan_user_id = $1
    ORDER BY s.created_at DESC
  `, [req.fanUser.id]);

  // Build calendar host from request
  const host = req.headers.host;
  const subs = rows.map(r => ({ ...r, calendar_host: host }));

  const flash = req.session.fanFlash;
  delete req.session.fanFlash;
  res.send(fanDashboardPage(req.fanUser, subs, flash));
});

app.post("/fan/unsubscribe", async (req, res) => {
  if (!req.fanUser) return res.redirect("/fan/login");
  await pool.query(
    "DELETE FROM subscribers WHERE fan_user_id = $1 AND team_id = $2",
    [req.fanUser.id, req.body.teamId]
  );
  req.session.fanFlash = { type: "success", msg: "You've been unsubscribed." };
  res.redirect("/my-teams");
});

// Public email subscribe
app.post("/:slug/subscribe", async (req, res) => {
  const { slug } = req.params;
  const { email } = req.body;

  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE slug = $1", [slug]);
  if (!teams.length) return res.redirect(`/${slug}`);
  const team = teams[0];

  // Must be logged in as fan to subscribe
  if (!req.fanUser) {
    return res.redirect(`/fan/login?returnTo=/${slug}`);
  }

  const fanEmail = req.fanUser.email;
  let flash;
  try {
    await pool.query(
      "INSERT INTO subscribers (team_id, email, fan_user_id) VALUES ($1, $2, $3)",
      [team.id, fanEmail, req.fanUser.id]
    );
    flash = { type: "success", msg: `subscribed` };
  } catch (e) {
    if (e.code === "23505") {
      flash = { type: "info", msg: "already" };
    } else {
      flash = { type: "error", msg: "Something went wrong — please try again." };
    }
  }
  req.session.teamFlash = flash;
  res.redirect(`/${slug}`);
});

// Team public webpage — must be last so it doesn't swallow other routes
app.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE slug = $1", [slug]);
  if (!teams.length) return res.status(404).send("Team not found");

  const team = teams[0];
  const { rows: fixtures } = await pool.query(
    "SELECT * FROM fixtures WHERE team_id = $1 ORDER BY start_time ASC",
    [team.id]
  );

  const host = req.headers.host;
  const calendarUrl = `https://${host}/calendar/${slug}.ics`;

  // Check if logged-in fan is already subscribed to this team
  let isSubscribed = false;
  if (req.fanUser) {
    const { rows: sub } = await pool.query(
      "SELECT id FROM subscribers WHERE team_id = $1 AND fan_user_id = $2",
      [team.id, req.fanUser.id]
    );
    isSubscribed = sub.length > 0;
  }

  const flash = req.session.teamFlash;
  delete req.session.teamFlash;

  res.setHeader("Content-Type", "text/html");
  res.send(teamPage(team, fixtures, calendarUrl, flash, req.fanUser, isSubscribed));
});

// --- Start ---

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Fixture feed running on port ${PORT}`);
  });
});
