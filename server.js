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
// Base URL used in email links (RSVP buttons, team page links)
const APP_URL = (process.env.APP_URL || "https://fixture-app-production.up.railway.app").replace(/\/$/, "");
const nodeCrypto = require("crypto");

// Signed token so RSVP links in emails work without logging in
function rsvpToken(uid, email) {
  return nodeCrypto.createHmac("sha256", SESSION_SECRET)
    .update(`${uid}|${email.toLowerCase()}`)
    .digest("hex").slice(0, 32);
}
function rsvpLink(uid, email, status) {
  const q = new URLSearchParams({ uid, email, status, token: rsvpToken(uid, email) });
  return `${APP_URL}/rsvp?${q.toString()}`;
}

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

// squadId optional: whole-club followers always included; squad followers
// only get emails for their squad (and club-wide events).
async function getSubscriberEmails(teamId, squadId) {
  const { rows } = squadId
    ? await pool.query(
        "SELECT email FROM subscribers WHERE team_id = $1 AND (squad_id IS NULL OR squad_id = $2)",
        [teamId, squadId])
    : await pool.query("SELECT email FROM subscribers WHERE team_id = $1", [teamId]);
  return rows.map(r => r.email);
}

async function sendCancellationEmails(team, fixture, cancelType) {
  const emails = await getSubscriberEmails(team.id, fixture.squad_id);
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
  const emails = await getSubscriberEmails(team.id, fixture.squad_id);
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
  const emails = await getSubscriberEmails(team.id, fixture.squad_id);
  if (!emails.length) return 0;

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

// --- Event reminders with one-tap RSVP links ---

const fmtShort = iso => new Date(iso).toLocaleDateString("en-GB",
  { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

function rsvpButtonsHtml(uid, email) {
  const btn = (status, label, bg) =>
    `<a href="${rsvpLink(uid, email, status)}"
        style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;
               font-weight:bold;font-size:14px;padding:12px 22px;border-radius:6px;margin:0 4px">${label}</a>`;
  return `
    <div style="text-align:center;margin:24px 0">
      ${btn("going", "✓ Going", "#1a7a2e")}
      ${btn("maybe", "? Maybe", "#b8860b")}
      ${btn("no", "✗ Can't Attend", "#aa2222")}
    </div>`;
}

// Sends a reminder for one event to every subscriber (individually, so RSVP links are personal)
async function sendEventReminder(team, event) {
  const emails = await getSubscriberEmails(team.id, event.squad_id);
  if (!emails.length) return 0;

  const kindLabel = (event.event_kind && event.event_kind !== "fixture")
    ? event.event_kind.charAt(0).toUpperCase() + event.event_kind.slice(1)
    : "Fixture";

  let sent = 0;
  for (const email of emails) {
    try {
      await resend.emails.send({
        from: "Fixture Updates <onboarding@resend.dev>",
        to: email,
        subject: `Reminder: ${event.summary} — ${fmtShort(event.start_time)}`,
        html: `
          <h2 style="margin-bottom:4px">${kindLabel} Reminder</h2>
          <p style="font-size:16px"><strong>${event.summary}</strong></p>
          <table style="border-collapse:collapse;font-family:sans-serif">
            <tr><td style="padding:6px;color:#666">When:</td><td style="padding:6px"><strong>${fmtShort(event.start_time)}</strong></td></tr>
            <tr><td style="padding:6px;color:#666">Where:</td><td style="padding:6px">${event.location || "TBC"}</td></tr>
            ${event.description ? `<tr><td style="padding:6px;color:#666">Notes:</td><td style="padding:6px">${event.description}</td></tr>` : ""}
          </table>
          <p style="font-weight:bold;margin-top:20px;text-align:center">Can you make it? One tap — no login needed:</p>
          ${rsvpButtonsHtml(event.uid, email)}
          <p style="color:#666;font-size:12px;text-align:center">
            <a href="${APP_URL}/${team.slug}" style="color:#cc0000">View all fixtures for ${team.name}</a>
          </p>
        `,
      });
      sent++;
    } catch (e) {
      console.error(`[reminders] failed for ${email}:`, e.message);
    }
  }
  return sent;
}

// Hourly sweep: remind subscribers about events starting within the next 72 hours.
// Paid tiers only (email features), once per event (reminder_sent_at guard).
async function runReminderSweep() {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { rows: due } = await pool.query(
      `SELECT f.*, t.name AS team_name, t.slug AS team_slug, t.id AS t_id
       FROM fixtures f JOIN teams t ON t.id = f.team_id
       WHERE f.status = 'active'
         AND f.reminder_sent_at IS NULL
         AND f.start_time > NOW()
         AND f.start_time <= NOW() + INTERVAL '72 hours'
         AND t.tier IN ('standard', 'pro')`
    );
    for (const event of due) {
      const team = { id: event.t_id, name: event.team_name, slug: event.team_slug };
      const sent = await sendEventReminder(team, event);
      await pool.query("UPDATE fixtures SET reminder_sent_at = NOW() WHERE id = $1", [event.id]);
      if (sent) console.log(`[reminders] ${event.summary}: ${sent} reminder(s) sent`);
    }
  } catch (e) {
    console.error("[reminders] sweep failed:", e.message);
  }
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
      "INSERT INTO users (email, password_hash, team_id, role) VALUES ($1, $2, $3, 'owner') RETURNING *",
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

  // Optional per-squad feed: /calendar/slug.ics?squad=ID
  // includes that squad's fixtures plus club-wide (no-squad) events
  const squadId = req.query.squad ? parseInt(req.query.squad, 10) : null;
  let squadName = null;
  if (squadId) {
    const { rows: sq } = await pool.query(
      "SELECT name FROM squads WHERE id = $1 AND team_id = $2", [squadId, team.id]);
    if (sq.length) squadName = sq[0].name;
  }

  const { rows: fixtures } = (squadId && squadName)
    ? await pool.query(
        `SELECT f.*, sq.name AS squad_name FROM fixtures f
         LEFT JOIN squads sq ON sq.id = f.squad_id
         WHERE f.team_id = $1 AND (f.squad_id = $2 OR f.squad_id IS NULL)
         ORDER BY f.start_time ASC`, [team.id, squadId])
    : await pool.query(
        `SELECT f.*, sq.name AS squad_name FROM fixtures f
         LEFT JOIN squads sq ON sq.id = f.squad_id
         WHERE f.team_id = $1 ORDER BY f.start_time ASC`, [team.id]);

  const calendar = ical({
    name: squadName ? `${team.name} — ${squadName}` : `${team.name} Fixtures`,
    description: `Live fixture schedule for ${team.name}${squadName ? ` (${squadName})` : ""}`,
    prodId: { company: "FixtureApp", product: "Sports Calendar", language: "EN" },
    ttl: 1800,
  });

  for (const fixture of fixtures) {
    const cancelled = fixture.status === "cancelled_hidden" || fixture.status === "cancelled_shown";
    const baseSummary = fixture.squad_name ? `${fixture.squad_name}: ${fixture.summary}` : fixture.summary;
    const event = calendar.createEvent({
      sequence: fixture.sequence,
      summary: cancelled ? `CANCELLED: ${baseSummary}` : baseSummary,
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

// Role guard — use after requireLogin. 'master' always passes.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.redirect("/dashboard/login");
    if (req.user.role === "master" || roles.includes(req.user.role)) return next();
    req.session.flash = { type: "error", msg: "You don't have permission to do that." };
    return res.redirect("/dashboard");
  };
}

// Audit trail — best-effort, never blocks the action
async function audit(teamId, user, action, detail) {
  try {
    await pool.query(
      "INSERT INTO audit_log (team_id, user_email, action, detail) VALUES ($1, $2, $3, $4)",
      [teamId, user ? user.email : null, action, detail || null]
    );
  } catch (e) {
    console.error("[audit]", e.message);
  }
}

// Per-squad delegation: squads a coach is restricted to (null = unrestricted)
async function getManageableSquadIds(user) {
  if (user.role !== "coach") return null;
  const { rows } = await pool.query("SELECT squad_id FROM user_squads WHERE user_id = $1", [user.id]);
  return rows.length ? rows.map(r => r.squad_id) : null;
}

// Can this user manage a fixture in this squad? (squadId null = club-wide)
async function canManageSquad(user, squadId) {
  const allowed = await getManageableSquadIds(user);
  if (allowed === null) return true;
  return squadId != null && allowed.includes(Number(squadId));
}

function squadDeniedFlash(req) {
  req.session.flash = { type: "error", msg: "You can only manage fixtures for your assigned squads." };
}

async function loadSessionUser(req, res, next) {
  if (req.session.userId) {
    const { rows } = await pool.query(
      `SELECT u.*, t.theme AS team_theme
       FROM users u LEFT JOIN teams t ON t.id = u.team_id
       WHERE u.id = $1`, [req.session.userId]);
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
    `SELECT f.*, sq.name AS squad_name FROM fixtures f
     LEFT JOIN squads sq ON sq.id = f.squad_id
     WHERE f.team_id = $1 ORDER BY f.start_time ASC`, [team.id]
  );
  const { rows: subscribers } = await pool.query(
    "SELECT * FROM subscribers WHERE team_id = $1", [team.id]
  );

  // Availability roll-up per event: { uid: { going, maybe, no } }
  const { rows: availRows } = await pool.query(
    `SELECT f.uid, a.status, COUNT(*)::int AS n
     FROM availability a JOIN fixtures f ON f.id = a.fixture_id
     WHERE f.team_id = $1 GROUP BY f.uid, a.status`, [team.id]
  );
  const availability = {};
  for (const r of availRows) {
    availability[r.uid] = availability[r.uid] || { going: 0, maybe: 0, no: 0 };
    if (availability[r.uid][r.status] !== undefined) availability[r.uid][r.status] = r.n;
  }

  const { rows: squads } = await pool.query(
    "SELECT * FROM squads WHERE team_id = $1 ORDER BY name", [team.id]);
  const manageableSquadIds = await getManageableSquadIds(req.user);

  const flash = req.session.flash;
  delete req.session.flash;
  res.send(homePage(req.user, team, fixtures, subscribers, flash, team.home_venue, availability, squads, manageableSquadIds));
});

// Availability detail for one event — who responded what
app.get("/dashboard/availability/:uid", requireLogin, async (req, res) => {
  const { rows: events } = await pool.query(
    "SELECT * FROM fixtures WHERE uid = $1 AND team_id = $2", [req.params.uid, req.user.team_id]
  );
  if (!events.length) return res.redirect("/dashboard");
  const event = events[0];

  const { rows: responses } = await pool.query(
    `SELECT a.*, fm.name AS member_name
     FROM availability a LEFT JOIN family_members fm ON fm.id = a.family_member_id
     WHERE a.fixture_id = $1 ORDER BY a.status, fm.name NULLS FIRST, a.email`, [event.id]
  );

  const { layout } = require("./views/dashboard/layout");
  const groups = { going: [], maybe: [], no: [] };
  responses.forEach(r => (groups[r.status] || groups.no).push(r));

  const who = r => r.member_name
    ? `<strong>${r.member_name}</strong> <span style="color:var(--text-4);font-size:0.75rem">via ${r.email}</span>`
    : r.email;

  const groupHtml = (label, color, list) => `
    <div class="card">
      <div class="card-title" style="color:${color}">${label} (${list.length})</div>
      ${list.length ? `<table><tbody>${list.map(r => `
        <tr><td>${who(r)}</td><td style="color:var(--text-3)">${r.note || ""}</td>
        <td style="color:var(--text-4);font-size:0.75rem">${new Date(r.updated_at).toLocaleDateString("en-GB")}</td></tr>`).join("")}
      </tbody></table>` : `<p style="color:var(--text-4);font-size:0.85rem">No responses.</p>`}
    </div>`;

  const when = new Date(event.start_time).toLocaleDateString("en-GB",
    { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const content = `
    <div class="page-header">
      <h1>Availability</h1>
      <p>${event.summary} — ${when}</p>
    </div>
    <a href="/dashboard" class="btn btn-secondary btn-sm" style="margin-bottom:16px">← Back to Fixtures</a>
    ${groupHtml("✓ Going", "#4caf50", groups.going)}
    ${groupHtml("? Maybe", "#f0b429", groups.maybe)}
    ${groupHtml("✗ Can't Attend", "#ff6666", groups.no)}
  `;
  res.send(layout("Availability", content, req.user));
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

  if ((await getManageableSquadIds(req.user)) !== null) {
    req.session.flash = { type: "error", msg: "Imports are limited to owners, managers and unrestricted coaches." };
    return res.redirect("/dashboard");
  }

  const { rows: teamRows } = await pool.query("SELECT * FROM teams WHERE id = $1", [req.user.team_id]);
  const team = teamRows[0];

  const { fixtures, errors } = await parseFixtures(req.file.buffer, req.file.mimetype, team.name);

  if (!fixtures.length && errors.length) {
    req.session.flash = { type: "error", msg: `Import failed: ${errors.join(" | ")}` };
    return res.redirect("/dashboard");
  }

  const { rows: importSquads } = await pool.query(
    "SELECT id, name FROM squads WHERE team_id = $1", [team.id]);

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

    // Match squad name (case-insensitive) against this club's squads
    let squadId = null;
    if (f.squadName) {
      const match = importSquads.find(s => s.name.toLowerCase() === f.squadName.toLowerCase());
      if (match) squadId = match.id;
    }

    const uid = `${team.slug}-${Date.now()}-${imported}@calendar.fixture-app.com`;
    await pool.query(
      `INSERT INTO fixtures (team_id, uid, summary, location, description, start_time, end_time, home_team, away_team, is_home, fixture_type, squad_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [team.id, uid, f.summary, f.location, f.description, f.start, f.end || f.start, f.homeTeam, f.awayTeam, f.isHome, f.fixtureType || "league", squadId]
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

// Resolve a posted squadId to a valid id for this team, or null
async function resolveSquadId(teamId, squadId) {
  if (!squadId) return null;
  const { rows } = await pool.query("SELECT id FROM squads WHERE id = $1 AND team_id = $2", [squadId, teamId]);
  return rows.length ? rows[0].id : null;
}

// Add fixture via dashboard
app.post("/dashboard/fixtures/add", requireLogin, async (req, res) => {
  const { homeTeam, awayTeam, isHome, start, end, location, description, fixtureType, squadId } = req.body;
  const teamId = req.user.team_id;
  const team = (await pool.query("SELECT * FROM teams WHERE id = $1", [teamId])).rows[0];

  const uid = `${team.slug}-${Date.now()}@calendar.fixture-app.com`;
  const summary = `${homeTeam} vs ${awayTeam}`;
  const sqId = await resolveSquadId(teamId, squadId);
  if (!(await canManageSquad(req.user, sqId))) { squadDeniedFlash(req); return res.redirect("/dashboard"); }

  await pool.query(
    `INSERT INTO fixtures (team_id, uid, summary, location, description, start_time, end_time, home_team, away_team, is_home, fixture_type, squad_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [teamId, uid, summary, location, description, start, end, homeTeam, awayTeam, isHome === "true", fixtureType || "league", sqId]
  );

  audit(teamId, req.user, "fixture_added", summary);
  req.session.flash = { type: "success", msg: `Fixture added: ${summary}` };
  res.redirect("/dashboard");
});

// Add a non-fixture event (training, meeting, social, volunteer duty), optionally repeating weekly
app.post("/dashboard/events/add", requireLogin, async (req, res) => {
  const { kind, title, date, startTime, endTime, location, description, repeatWeekly, repeatUntil, squadId } = req.body;
  const validKinds = ["training", "meeting", "social", "duty"];
  const eventKind = validKinds.includes(kind) ? kind : "training";

  if (!title?.trim() || !date || !startTime || !endTime) {
    req.session.flash = { type: "error", msg: "Title, date and times are required." };
    return res.redirect("/dashboard");
  }

  const teamId = req.user.team_id;
  const team = (await pool.query("SELECT * FROM teams WHERE id = $1", [teamId])).rows[0];

  // Build the list of dates: single, or weekly until repeatUntil (capped at 60 occurrences)
  const dates = [];
  let d = new Date(`${date}T00:00:00Z`);
  if (repeatWeekly === "1" && repeatUntil) {
    const until = new Date(`${repeatUntil}T23:59:59Z`);
    while (d <= until && dates.length < 60) {
      dates.push(d.toISOString().slice(0, 10));
      d = new Date(d.getTime() + 7 * 86400000);
    }
  }
  if (!dates.length) dates.push(date);

  const recurrenceGroup = dates.length > 1 ? `${team.slug}-rec-${Date.now()}` : null;
  const sqId = await resolveSquadId(teamId, squadId);
  if (!(await canManageSquad(req.user, sqId))) { squadDeniedFlash(req); return res.redirect("/dashboard"); }

  for (let i = 0; i < dates.length; i++) {
    const uid = `${team.slug}-${Date.now()}-${i}@calendar.fixture-app.com`;
    await pool.query(
      `INSERT INTO fixtures (team_id, uid, summary, location, description, start_time, end_time, event_kind, recurrence_group, squad_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [teamId, uid, title.trim(), location || null, description || null,
       `${dates[i]}T${startTime}:00Z`, `${dates[i]}T${endTime}:00Z`, eventKind, recurrenceGroup, sqId]
    );
  }

  const msg = dates.length > 1
    ? `${title.trim()} added — ${dates.length} weekly sessions created.`
    : `Event added: ${title.trim()}`;
  audit(teamId, req.user, "event_added", `${eventKind}: ${title.trim()} x${dates.length}`);
  req.session.flash = { type: "success", msg };
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

  if (!(await canManageSquad(req.user, existing[0].squad_id))) { squadDeniedFlash(req); return res.redirect("/dashboard"); }
  const oldStart = existing[0].start_time;

  const { rows: updated } = await pool.query(
    `UPDATE fixtures SET start_time=$1, end_time=$2, sequence=sequence+1,
     description=CASE WHEN description NOT LIKE '%(RESCHEDULED)%' THEN description||' (RESCHEDULED)' ELSE description END,
     updated_at=NOW() WHERE uid=$3 AND team_id=$4 RETURNING *`,
    [newStart, newEnd, uid, teamId]
  );

  await sendRescheduleEmails(team, { ...updated[0], reason }, oldStart);
  audit(teamId, req.user, "fixture_rescheduled", `${updated[0].summary} -> ${newStart}${reason ? " (" + reason + ")" : ""}`);
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

  const { rows: preCancel } = await pool.query("SELECT squad_id FROM fixtures WHERE uid=$1 AND team_id=$2", [uid, teamId]);
  if (preCancel.length && !(await canManageSquad(req.user, preCancel[0].squad_id))) { squadDeniedFlash(req); return res.redirect("/dashboard"); }

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
  audit(teamId, req.user, "fixture_cancelled", `${rows[0].summary} (${cancelType})`);
  req.session.flash = { type: "success", msg };
  res.redirect("/dashboard");
});

// Edit fixture (opponent, home/away, venue, description)
app.post("/dashboard/fixtures/edit", requireLogin, async (req, res) => {
  const { uid, opponent, isHome, location, description, fixtureType, squadId } = req.body;
  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE id = $1", [req.user.team_id]);
  const teamName = teams[0].name;

  // Fetch current fixture to detect venue change
  const { rows: existing } = await pool.query("SELECT * FROM fixtures WHERE uid=$1 AND team_id=$2", [uid, req.user.team_id]);
  if (!existing.length) { req.session.flash = { type: "error", msg: "Fixture not found." }; return res.redirect("/dashboard"); }
  const oldVenue = existing[0].location;
  if (!(await canManageSquad(req.user, existing[0].squad_id))) { squadDeniedFlash(req); return res.redirect("/dashboard"); }

  const home = isHome === "true";
  const homeTeam = home ? teamName : opponent;
  const awayTeam = home ? opponent : teamName;
  const summary  = `${homeTeam} vs ${awayTeam}`;
  const newVenue = location || null;
  const venueChanged = (oldVenue || "") !== (newVenue || "");

  const sqId = await resolveSquadId(req.user.team_id, squadId);
  if (!(await canManageSquad(req.user, sqId))) { squadDeniedFlash(req); return res.redirect("/dashboard"); }
  audit(req.user.team_id, req.user, "fixture_edited", summary);

  await pool.query(
    `UPDATE fixtures
     SET summary=$1, home_team=$2, away_team=$3, is_home=$4,
         location=$5, description=$6, fixture_type=$7, squad_id=$8, sequence=sequence+1, updated_at=NOW()
     WHERE uid=$9 AND team_id=$10`,
    [summary, homeTeam, awayTeam, home, newVenue, description || null, fixtureType || "league", sqId, uid, req.user.team_id]
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

// Record or update a match result
app.post("/dashboard/fixtures/result", requireLogin, async (req, res) => {
  const { uid, homeScore, awayScore, scorers, matchReport } = req.body;
  const hs = parseInt(homeScore, 10);
  const as = parseInt(awayScore, 10);
  if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0 || hs > 999 || as > 999) {
    req.session.flash = { type: "error", msg: "Please enter valid scores." };
    return res.redirect("/dashboard");
  }
  const { rows: preResult } = await pool.query("SELECT squad_id FROM fixtures WHERE uid=$1 AND team_id=$2", [uid, req.user.team_id]);
  if (preResult.length && !(await canManageSquad(req.user, preResult[0].squad_id))) { squadDeniedFlash(req); return res.redirect("/dashboard"); }
  const { rows } = await pool.query(
    `UPDATE fixtures SET home_score=$1, away_score=$2, scorers=$3, match_report=$4, updated_at=NOW()
     WHERE uid=$5 AND team_id=$6 AND (event_kind IS NULL OR event_kind='fixture') RETURNING summary`,
    [hs, as, (scorers || "").trim() || null, (matchReport || "").trim() || null, uid, req.user.team_id]
  );
  if (rows.length) audit(req.user.team_id, req.user, "result_saved", `${rows[0].summary} ${hs}-${as}`);
  req.session.flash = rows.length
    ? { type: "success", msg: `Result saved: ${rows[0].summary} ${hs}–${as}` }
    : { type: "error", msg: "Fixture not found." };
  res.redirect("/dashboard");
});

// Clear a result
app.post("/dashboard/fixtures/result/clear", requireLogin, async (req, res) => {
  await pool.query(
    `UPDATE fixtures SET home_score=NULL, away_score=NULL, scorers=NULL, match_report=NULL, updated_at=NOW()
     WHERE uid=$1 AND team_id=$2`, [req.body.uid, req.user.team_id]
  );
  req.session.flash = { type: "success", msg: "Result cleared." };
  res.redirect("/dashboard");
});

// Restore a cancelled fixture
app.post("/dashboard/fixtures/restore", requireLogin, async (req, res) => {
  const { uid } = req.body;
  const { rows: preRestore } = await pool.query("SELECT squad_id, summary FROM fixtures WHERE uid=$1 AND team_id=$2", [uid, req.user.team_id]);
  if (preRestore.length && !(await canManageSquad(req.user, preRestore[0].squad_id))) { squadDeniedFlash(req); return res.redirect("/dashboard"); }
  if (preRestore.length) audit(req.user.team_id, req.user, "fixture_restored", preRestore[0].summary);
  await pool.query(
    `UPDATE fixtures SET status='active', sequence=sequence+1, updated_at=NOW() WHERE uid=$1 AND team_id=$2`,
    [uid, req.user.team_id]
  );
  req.session.flash = { type: "success", msg: "Fixture restored." };
  res.redirect("/dashboard");
});

// Messages page — compose + history
app.get("/dashboard/messages", requireLogin, requireRole("owner", "manager"), async (req, res) => {
  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE id = $1", [req.user.team_id]);
  const team = teams[0];
  const { rows: announcements } = await pool.query(
    "SELECT * FROM announcements WHERE team_id = $1 ORDER BY created_at DESC LIMIT 50", [team.id]
  );
  const { rows: subCount } = await pool.query(
    "SELECT COUNT(*)::int AS n FROM subscribers WHERE team_id = $1", [team.id]
  );
  const flash = req.session.flash; delete req.session.flash;
  const { messagesPage } = require("./views/dashboard/messages");
  res.send(messagesPage(req.user, team, announcements, subCount[0].n, flash));
});

// Send an announcement to all subscribers
app.post("/dashboard/messages/send", requireLogin, requireRole("owner", "manager"), async (req, res) => {
  const { subject, body } = req.body;
  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE id = $1", [req.user.team_id]);
  const team = teams[0];

  if (!(team.tier === "standard" || team.tier === "pro")) {
    req.session.flash = { type: "error", msg: "Announcements are available on the Standard plan." };
    return res.redirect("/dashboard/messages");
  }
  if (!subject?.trim() || !body?.trim()) {
    req.session.flash = { type: "error", msg: "Subject and message are both required." };
    return res.redirect("/dashboard/messages");
  }

  const emails = await getSubscriberEmails(team.id);
  if (!emails.length) {
    req.session.flash = { type: "error", msg: "No subscribers to send to yet." };
    return res.redirect("/dashboard/messages");
  }

  // Escape HTML in user content, keep line breaks
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bodyHtml = esc(body.trim()).replace(/\r?\n/g, "<br>");

  let sent = 0;
  try {
    await resend.emails.send({
      from: "Fixture Updates <onboarding@resend.dev>",
      to: emails,
      subject: `${team.name}: ${subject.trim()}`,
      html: `
        <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999;margin-bottom:4px">Announcement from ${team.name}</p>
        <h2 style="margin:0 0 16px">${esc(subject.trim())}</h2>
        <div style="font-size:15px;line-height:1.6">${bodyHtml}</div>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0 12px">
        <p style="color:#999;font-size:12px">
          You're receiving this because you subscribe to ${team.name} on FixtureApp.
          <a href="${APP_URL}/${team.slug}" style="color:#cc0000">View fixtures</a>
        </p>
      `,
    });
    sent = emails.length;
  } catch (e) {
    console.error("[messages] send failed:", e.message);
    req.session.flash = { type: "error", msg: "Sending failed — please try again." };
    return res.redirect("/dashboard/messages");
  }

  await pool.query(
    "INSERT INTO announcements (team_id, subject, body, sent_to) VALUES ($1, $2, $3, $4)",
    [team.id, subject.trim(), body.trim(), sent]
  );

  audit(team.id, req.user, "announcement_sent", `${subject.trim()} (${sent} recipients)`);
  req.session.flash = { type: "success", msg: `Announcement sent to ${sent} subscriber${sent === 1 ? "" : "s"}.` };
  res.redirect("/dashboard/messages");
});

// --- Player roster & line-ups ---

app.get("/dashboard/players", requireLogin, async (req, res) => {
  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE id = $1", [req.user.team_id]);
  const { rows: players } = await pool.query(
    `SELECT p.*, sq.name AS squad_name FROM players p
     LEFT JOIN squads sq ON sq.id = p.squad_id
     WHERE p.team_id = $1 ORDER BY sq.name NULLS FIRST, p.name`, [req.user.team_id]);
  const { rows: squads } = await pool.query(
    "SELECT * FROM squads WHERE team_id = $1 ORDER BY name", [req.user.team_id]);
  const flash = req.session.flash; delete req.session.flash;
  const { playersPage } = require("./views/dashboard/players");
  res.send(playersPage(req.user, teams[0], players, squads, flash));
});

app.post("/dashboard/players/add", requireLogin, async (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) {
    req.session.flash = { type: "error", msg: "Player name is required." };
    return res.redirect("/dashboard/players");
  }
  const sqId = await resolveSquadId(req.user.team_id, req.body.squadId);
  await pool.query("INSERT INTO players (team_id, squad_id, name) VALUES ($1, $2, $3)",
    [req.user.team_id, sqId, name]);
  audit(req.user.team_id, req.user, "player_added", name);
  req.session.flash = { type: "success", msg: `${name} added to the roster.` };
  res.redirect("/dashboard/players");
});

app.post("/dashboard/players/remove", requireLogin, async (req, res) => {
  const { rows } = await pool.query(
    "DELETE FROM players WHERE id = $1 AND team_id = $2 RETURNING name", [req.body.playerId, req.user.team_id]);
  if (rows.length) audit(req.user.team_id, req.user, "player_removed", rows[0].name);
  req.session.flash = { type: "success", msg: "Player removed." };
  res.redirect("/dashboard/players");
});

// Line-up picker for one fixture
app.get("/dashboard/lineup/:uid", requireLogin, async (req, res) => {
  const { rows: events } = await pool.query(
    `SELECT f.*, sq.name AS squad_name FROM fixtures f
     LEFT JOIN squads sq ON sq.id = f.squad_id
     WHERE f.uid = $1 AND f.team_id = $2`, [req.params.uid, req.user.team_id]);
  if (!events.length) return res.redirect("/dashboard");
  const fixture = events[0];
  if (!(await canManageSquad(req.user, fixture.squad_id))) { squadDeniedFlash(req); return res.redirect("/dashboard"); }

  // Roster scope: squad fixtures see that squad + unassigned players; club-wide sees everyone
  const { rows: players } = fixture.squad_id
    ? await pool.query(
        `SELECT p.*, sq.name AS squad_name FROM players p
         LEFT JOIN squads sq ON sq.id = p.squad_id
         WHERE p.team_id = $1 AND (p.squad_id = $2 OR p.squad_id IS NULL)
         ORDER BY p.squad_id NULLS LAST, p.name`, [req.user.team_id, fixture.squad_id])
    : await pool.query(
        `SELECT p.*, sq.name AS squad_name FROM players p
         LEFT JOIN squads sq ON sq.id = p.squad_id
         WHERE p.team_id = $1 ORDER BY sq.name NULLS FIRST, p.name`, [req.user.team_id]);

  const { rows: selected } = await pool.query(
    "SELECT player_id FROM lineups WHERE fixture_id = $1", [fixture.id]);
  const selectedIds = new Set(selected.map(r => r.player_id));

  const flash = req.session.flash; delete req.session.flash;
  const { lineupPage } = require("./views/dashboard/lineup");
  res.send(lineupPage(req.user, fixture, players, selectedIds, flash));
});

app.post("/dashboard/lineup/:uid", requireLogin, async (req, res) => {
  const { rows: events } = await pool.query(
    "SELECT * FROM fixtures WHERE uid = $1 AND team_id = $2", [req.params.uid, req.user.team_id]);
  if (!events.length) return res.redirect("/dashboard");
  const fixture = events[0];
  if (!(await canManageSquad(req.user, fixture.squad_id))) { squadDeniedFlash(req); return res.redirect("/dashboard"); }

  let ids = req.body.playerIds || [];
  if (!Array.isArray(ids)) ids = [ids];

  await pool.query("DELETE FROM lineups WHERE fixture_id = $1", [fixture.id]);
  for (const pid of ids) {
    await pool.query(
      `INSERT INTO lineups (fixture_id, player_id)
       SELECT $1, id FROM players WHERE id = $2 AND team_id = $3
       ON CONFLICT DO NOTHING`,
      [fixture.id, pid, req.user.team_id]);
  }
  audit(req.user.team_id, req.user, "lineup_saved", `${fixture.summary} (${ids.length} players)`);
  req.session.flash = { type: "success", msg: `Line-up saved — ${ids.length} player${ids.length === 1 ? "" : "s"} selected.` };
  res.redirect(`/dashboard/lineup/${req.params.uid}`);
});

// --- Activity log (owner) ---

app.get("/dashboard/activity", requireLogin, requireRole("owner"), async (req, res) => {
  const { rows: entries } = await pool.query(
    "SELECT * FROM audit_log WHERE team_id = $1 ORDER BY created_at DESC LIMIT 200", [req.user.team_id]);
  const { layout } = require("./views/dashboard/layout");
  const fmtA = d => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const label = a => a.replace(/_/g, " ");
  const content = `
    <div class="page-header">
      <h1>Activity Log</h1>
      <p>Who did what — the last 200 actions in your club.</p>
    </div>
    <div class="card">
      ${entries.length ? `
      <table>
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead>
        <tbody>${entries.map(e => `
          <tr>
            <td style="white-space:nowrap;color:var(--text-4)">${fmtA(e.created_at)}</td>
            <td>${e.user_email || "—"}</td>
            <td style="text-transform:capitalize;font-weight:600">${label(e.action)}</td>
            <td style="color:var(--text-3)">${e.detail || ""}</td>
          </tr>`).join("")}
        </tbody>
      </table>` : `<p style="color:var(--text-4);font-size:0.85rem">No activity recorded yet.</p>`}
    </div>
  `;
  res.send(layout("Activity Log", content, req.user));
});

// --- Team members & invitations (owner only) ---

const INVITABLE_ROLES = ["owner", "manager", "coach"];

app.get("/dashboard/members", requireLogin, requireRole("owner"), async (req, res) => {
  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE id = $1", [req.user.team_id]);
  const { rows: members } = await pool.query(
    "SELECT id, email, role, created_at FROM users WHERE team_id = $1 ORDER BY created_at", [req.user.team_id]
  );
  const { rows: invites } = await pool.query(
    "SELECT * FROM invites WHERE team_id = $1 AND accepted_at IS NULL ORDER BY created_at DESC", [req.user.team_id]
  );
  const { rows: squads } = await pool.query(
    "SELECT * FROM squads WHERE team_id = $1 ORDER BY name", [req.user.team_id]);
  const { rows: assignments } = await pool.query(
    `SELECT us.user_id, us.squad_id FROM user_squads us
     JOIN users u ON u.id = us.user_id WHERE u.team_id = $1`, [req.user.team_id]);
  const assignMap = {};
  assignments.forEach(a => {
    assignMap[a.user_id] = assignMap[a.user_id] || [];
    assignMap[a.user_id].push(a.squad_id);
  });
  const flash = req.session.flash; delete req.session.flash;
  const { membersPage } = require("./views/dashboard/members");
  res.send(membersPage(req.user, teams[0], members, invites, flash, APP_URL, squads, assignMap));
});

// Assign a coach to specific squads (empty selection = unrestricted)
app.post("/dashboard/members/squads", requireLogin, requireRole("owner"), async (req, res) => {
  const { userId } = req.body;
  let squadIds = req.body.squadIds || [];
  if (!Array.isArray(squadIds)) squadIds = [squadIds];

  const { rows: target } = await pool.query(
    "SELECT * FROM users WHERE id = $1 AND team_id = $2", [userId, req.user.team_id]);
  if (!target.length) return res.redirect("/dashboard/members");

  await pool.query("DELETE FROM user_squads WHERE user_id = $1", [userId]);
  for (const sid of squadIds) {
    await pool.query(
      `INSERT INTO user_squads (user_id, squad_id)
       SELECT $1, id FROM squads WHERE id = $2 AND team_id = $3
       ON CONFLICT DO NOTHING`,
      [userId, sid, req.user.team_id]);
  }
  audit(req.user.team_id, req.user, "coach_squads_assigned",
    `${target[0].email}: ${squadIds.length ? squadIds.length + " squad(s)" : "unrestricted"}`);
  req.session.flash = { type: "success", msg: "Squad access updated." };
  res.redirect("/dashboard/members");
});

app.post("/dashboard/members/invite", requireLogin, requireRole("owner"), async (req, res) => {
  const { email, role } = req.body;
  const cleanEmail = (email || "").toLowerCase().trim();
  const cleanRole = INVITABLE_ROLES.includes(role) ? role : "coach";

  if (!cleanEmail) {
    req.session.flash = { type: "error", msg: "Email is required." };
    return res.redirect("/dashboard/members");
  }
  const { rows: existing } = await pool.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
  if (existing.length) {
    req.session.flash = { type: "error", msg: "An account with that email already exists." };
    return res.redirect("/dashboard/members");
  }
  // Replace any previous pending invite for this email+team
  await pool.query("DELETE FROM invites WHERE team_id = $1 AND email = $2 AND accepted_at IS NULL",
    [req.user.team_id, cleanEmail]);

  const token = nodeCrypto.randomBytes(24).toString("hex");
  await pool.query(
    "INSERT INTO invites (team_id, email, role, token, invited_by) VALUES ($1, $2, $3, $4, $5)",
    [req.user.team_id, cleanEmail, cleanRole, token, req.user.id]
  );

  const { rows: teams } = await pool.query("SELECT name FROM teams WHERE id = $1", [req.user.team_id]);
  const inviteUrl = `${APP_URL}/invite/${token}`;

  // Best-effort email; the link is always shown on the members page too
  try {
    await resend.emails.send({
      from: "Fixture Updates <onboarding@resend.dev>",
      to: cleanEmail,
      subject: `You've been invited to help run ${teams[0].name} on FixtureApp`,
      html: `
        <h2>You're invited</h2>
        <p><strong>${req.user.email}</strong> has invited you to join <strong>${teams[0].name}</strong>
           on FixtureApp as a <strong>${cleanRole}</strong>.</p>
        <p><a href="${inviteUrl}" style="display:inline-block;background:#cc0000;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px">Accept invitation</a></p>
        <p style="color:#666;font-size:12px">Or paste this link into your browser: ${inviteUrl}</p>
      `,
    });
  } catch (e) {
    console.error("[invite] email failed:", e.message);
  }

  audit(req.user.team_id, req.user, "member_invited", `${cleanEmail} as ${cleanRole}`);
  req.session.flash = { type: "success", msg: `Invite created for ${cleanEmail} — the link is shown below if you'd rather share it yourself.` };
  res.redirect("/dashboard/members");
});

app.post("/dashboard/members/cancel-invite", requireLogin, requireRole("owner"), async (req, res) => {
  await pool.query("DELETE FROM invites WHERE id = $1 AND team_id = $2 AND accepted_at IS NULL",
    [req.body.inviteId, req.user.team_id]);
  req.session.flash = { type: "success", msg: "Invite cancelled." };
  res.redirect("/dashboard/members");
});

app.post("/dashboard/members/role", requireLogin, requireRole("owner"), async (req, res) => {
  const { userId, role } = req.body;
  if (!INVITABLE_ROLES.includes(role)) return res.redirect("/dashboard/members");

  const { rows: target } = await pool.query(
    "SELECT * FROM users WHERE id = $1 AND team_id = $2", [userId, req.user.team_id]);
  if (!target.length) return res.redirect("/dashboard/members");

  // Never demote the last owner
  if (target[0].role === "owner" && role !== "owner") {
    const { rows: owners } = await pool.query(
      "SELECT COUNT(*)::int AS n FROM users WHERE team_id = $1 AND role = 'owner'", [req.user.team_id]);
    if (owners[0].n <= 1) {
      req.session.flash = { type: "error", msg: "A club must always have at least one owner." };
      return res.redirect("/dashboard/members");
    }
  }
  await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, userId]);
  audit(req.user.team_id, req.user, "member_role_changed", `${target[0].email} -> ${role}`);
  req.session.flash = { type: "success", msg: "Role updated." };
  res.redirect("/dashboard/members");
});

app.post("/dashboard/members/remove", requireLogin, requireRole("owner"), async (req, res) => {
  const { userId } = req.body;
  if (Number(userId) === req.user.id) {
    req.session.flash = { type: "error", msg: "You can't remove yourself." };
    return res.redirect("/dashboard/members");
  }
  const { rows: target } = await pool.query(
    "SELECT * FROM users WHERE id = $1 AND team_id = $2", [userId, req.user.team_id]);
  if (target.length && target[0].role === "owner") {
    const { rows: owners } = await pool.query(
      "SELECT COUNT(*)::int AS n FROM users WHERE team_id = $1 AND role = 'owner'", [req.user.team_id]);
    if (owners[0].n <= 1) {
      req.session.flash = { type: "error", msg: "A club must always have at least one owner." };
      return res.redirect("/dashboard/members");
    }
  }
  await pool.query("DELETE FROM users WHERE id = $1 AND team_id = $2", [userId, req.user.team_id]);
  if (target.length) audit(req.user.team_id, req.user, "member_removed", target[0].email);
  req.session.flash = { type: "success", msg: "Member removed." };
  res.redirect("/dashboard/members");
});

// Accept an invitation (public — token is the credential)
app.get("/invite/:token", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.*, t.name AS team_name FROM invites i JOIN teams t ON t.id = i.team_id
     WHERE i.token = $1 AND i.accepted_at IS NULL`, [req.params.token]);
  if (!rows.length) return res.status(404).send("This invitation is no longer valid.");
  const { invitePage } = require("./views/dashboard/invite");
  res.send(invitePage(rows[0], null));
});

app.post("/invite/:token", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.*, t.name AS team_name FROM invites i JOIN teams t ON t.id = i.team_id
     WHERE i.token = $1 AND i.accepted_at IS NULL`, [req.params.token]);
  if (!rows.length) return res.status(404).send("This invitation is no longer valid.");
  const invite = rows[0];
  const { invitePage } = require("./views/dashboard/invite");

  const { password, confirmPassword } = req.body;
  if (!password || password.length < 8) return res.send(invitePage(invite, "Password must be at least 8 characters."));
  if (password !== confirmPassword) return res.send(invitePage(invite, "Passwords do not match."));

  const { rows: existing } = await pool.query("SELECT id FROM users WHERE email = $1", [invite.email]);
  if (existing.length) return res.send(invitePage(invite, "An account with this email already exists."));

  const hash = await bcrypt.hash(password, 10);
  const { rows: userRows } = await pool.query(
    "INSERT INTO users (email, password_hash, team_id, role) VALUES ($1, $2, $3, $4) RETURNING *",
    [invite.email, hash, invite.team_id, invite.role]
  );
  await pool.query("UPDATE invites SET accepted_at = NOW() WHERE id = $1", [invite.id]);

  req.session.userId = userRows[0].id;
  req.session.flash = { type: "success", msg: `Welcome to ${invite.team_name}!` };
  res.redirect("/dashboard");
});

// Subscribers page
app.get("/dashboard/subscribers", requireLogin, requireRole("owner", "manager"), async (req, res) => {
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

app.post("/dashboard/subscribers/add", requireLogin, requireRole("owner", "manager"), async (req, res) => {
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
  const { rows: squads } = await pool.query(
    `SELECT s.*, (SELECT COUNT(*)::int FROM fixtures f WHERE f.squad_id = s.id) AS fixture_count
     FROM squads s WHERE s.team_id = $1 ORDER BY s.name`, [req.user.team_id]);
  const flash = req.session.flash; delete req.session.flash;
  res.send(settingsPage(req.user, teams[0], flash, squads));
});

// Toggle public line-up display (owner)
app.post("/dashboard/settings/lineups", requireLogin, requireRole("owner"), async (req, res) => {
  const show = req.body.showLineups === "1";
  await pool.query("UPDATE teams SET show_lineups = $1 WHERE id = $2", [show, req.user.team_id]);
  audit(req.user.team_id, req.user, "lineup_visibility_changed", show ? "public" : "private");
  req.session.flash = { type: "success", msg: `Line-ups are now ${show ? "shown on" : "hidden from"} your public page.` };
  res.redirect("/dashboard/settings");
});

// Squads CRUD (owner)
app.post("/dashboard/settings/squads/add", requireLogin, requireRole("owner"), async (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) {
    req.session.flash = { type: "error", msg: "Squad name is required." };
    return res.redirect("/dashboard/settings");
  }
  try {
    await pool.query("INSERT INTO squads (team_id, name) VALUES ($1, $2)", [req.user.team_id, name]);
    audit(req.user.team_id, req.user, "squad_added", name);
    req.session.flash = { type: "success", msg: `Squad "${name}" added.` };
  } catch (e) {
    req.session.flash = { type: "error", msg: e.code === "23505" ? "That squad already exists." : "Could not add squad." };
  }
  res.redirect("/dashboard/settings");
});

app.post("/dashboard/settings/squads/delete", requireLogin, requireRole("owner"), async (req, res) => {
  await pool.query("DELETE FROM squads WHERE id = $1 AND team_id = $2", [req.body.squadId, req.user.team_id]);
  req.session.flash = { type: "success", msg: "Squad removed — its fixtures are now club-wide and its followers follow the whole club." };
  res.redirect("/dashboard/settings");
});

// Update club name
app.post("/dashboard/settings/club", requireLogin, requireRole("owner"), async (req, res) => {
  const { clubName } = req.body;
  if (!clubName?.trim()) { req.session.flash = { type: "error", msg: "Club name cannot be empty." }; return res.redirect("/dashboard/settings"); }
  await pool.query("UPDATE teams SET name=$1 WHERE id=$2", [clubName.trim(), req.user.team_id]);
  req.session.flash = { type: "success", msg: "Club name updated." };
  res.redirect("/dashboard/settings");
});

// Update home venue
app.post("/dashboard/settings/home-venue", requireLogin, requireRole("owner"), async (req, res) => {
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

// Update theme
app.post("/dashboard/settings/theme", requireLogin, requireRole("owner"), async (req, res) => {
  const theme = req.body.theme === "light" ? "light" : "dark";
  await pool.query("UPDATE teams SET theme=$1 WHERE id=$2", [theme, req.user.team_id]);
  req.session.flash = { type: "success", msg: `Theme switched to ${theme} mode.` };
  res.redirect("/dashboard/settings");
});

// Update social media links
app.post("/dashboard/settings/social", requireLogin, requireRole("owner"), async (req, res) => {
  const { facebookUrl, instagramUrl, tiktokUrl } = req.body;
  const clean = (v) => (v || "").trim() || null;
  await pool.query(
    `UPDATE teams SET facebook_url=$1, instagram_url=$2, tiktok_url=$3 WHERE id=$4`,
    [clean(facebookUrl), clean(instagramUrl), clean(tiktokUrl), req.user.team_id]
  );
  req.session.flash = { type: "success", msg: "Social media links updated." };
  res.redirect("/dashboard/settings");
});

app.post("/dashboard/subscribers/remove", requireLogin, requireRole("owner", "manager"), async (req, res) => {
  await pool.query("DELETE FROM subscribers WHERE team_id=$1 AND email=$2", [req.user.team_id, req.body.email]);
  req.session.flash = { type: "success", msg: "Subscriber removed." };
  res.redirect("/dashboard/subscribers");
});

// Calendar feed info page
app.get("/dashboard/feed", requireLogin, async (req, res) => {
  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE id = $1", [req.user.team_id]);
  const team = teams[0];
  const { rows: squads } = await pool.query(
    "SELECT * FROM squads WHERE team_id = $1 ORDER BY name", [team.id]);
  const feedUrl = `https://${req.headers.host}/calendar/${team.slug}.ics`;
  const webcalUrl = feedUrl.replace("https://", "webcal://");
  const googleUrl  = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
  const outlookUrl = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent(team.name + " Fixtures")}`;
  const { layout } = require("./views/dashboard/layout");
  const content = `
    <div class="page-header"><h1>Calendar Feed</h1><p>Share these links with your fans.</p></div>
    <div class="card">
      <div class="card-title">Your Public Page</div>
      <p style="color:var(--text-3);font-size:0.85rem;margin-bottom:10px">Share this link with fans — they can subscribe from there in one tap.</p>
      <a href="/${team.slug}" target="_blank" class="btn btn-secondary">View Page →</a>
    </div>
    <div class="card">
      <div class="card-title">One-Tap Subscribe Links</div>
      <p style="color:var(--text-3);font-size:0.85rem;margin-bottom:14px">Test the calendar subscription yourself, or share a direct link for a specific app.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a href="${webcalUrl}" class="btn btn-secondary">🍎 Apple Calendar</a>
        <a href="${googleUrl}" target="_blank" class="btn btn-secondary">📆 Google Calendar</a>
        <a href="${outlookUrl}" target="_blank" class="btn btn-secondary">📧 Outlook</a>
      </div>
    </div>
    ${squads.length ? `
    <div class="card">
      <div class="card-title">Per-Squad Feeds</div>
      <p style="color:var(--text-3);font-size:0.85rem;margin-bottom:14px">Each squad has its own feed — that squad's fixtures plus club-wide events only. Perfect for parents who just want their child's squad.</p>
      ${squads.map(sq => `
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--border)">
          <strong style="min-width:120px">${sq.name}</strong>
          <a href="${webcalUrl}?squad=${sq.id}" class="btn btn-secondary btn-sm">🍎 Apple</a>
          <a href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl + "?squad=" + sq.id)}" target="_blank" class="btn btn-secondary btn-sm">📆 Google</a>
          <code style="background:var(--input-bg);border:1px solid var(--border);border-radius:6px;padding:5px 10px;color:var(--text-4);font-size:0.72rem;word-break:break-all;flex:1;min-width:200px">${feedUrl}?squad=${sq.id}</code>
        </div>
      `).join("")}
    </div>` : ""}
    <div class="card">
      <div class="card-title">Raw Subscription URL</div>
      <p style="color:var(--text-3);font-size:0.85rem;margin-bottom:10px">For any other calendar app that accepts an ICS URL.</p>
      <code style="background:var(--input-bg);border:1px solid var(--border);border-radius:8px;padding:10px 14px;display:block;color:var(--red);font-size:0.85rem;word-break:break-all">${feedUrl}</code>
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
    SELECT s.*, t.name AS team_name, t.slug AS team_slug, t.tier, sq.name AS squad_name
    FROM subscribers s
    JOIN teams t ON t.id = s.team_id
    LEFT JOIN squads sq ON sq.id = s.squad_id
    WHERE s.fan_user_id = $1
    ORDER BY s.created_at DESC
  `, [req.fanUser.id]);

  // Build calendar host from request
  const host = req.headers.host;
  const subs = rows.map(r => ({ ...r, calendar_host: host }));

  const { rows: familyMembers } = await pool.query(
    "SELECT * FROM family_members WHERE fan_user_id = $1 ORDER BY created_at", [req.fanUser.id]
  );

  const flash = req.session.fanFlash;
  delete req.session.fanFlash;
  res.send(fanDashboardPage(req.fanUser, subs, flash, familyMembers));
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

// Family members — guardians add the children/players they respond for
app.post("/fan/family/add", async (req, res) => {
  if (!req.fanUser) return res.redirect("/fan/login");
  const name = (req.body.name || "").trim();
  if (!name) {
    req.session.fanFlash = { type: "error", msg: "Please enter a name." };
    return res.redirect("/my-teams");
  }
  const { rows: count } = await pool.query(
    "SELECT COUNT(*)::int AS n FROM family_members WHERE fan_user_id = $1", [req.fanUser.id]);
  if (count[0].n >= 10) {
    req.session.fanFlash = { type: "error", msg: "You can add up to 10 family members." };
    return res.redirect("/my-teams");
  }
  await pool.query("INSERT INTO family_members (fan_user_id, name) VALUES ($1, $2)", [req.fanUser.id, name]);
  req.session.fanFlash = { type: "success", msg: `${name} added to your family.` };
  res.redirect("/my-teams");
});

app.post("/fan/family/remove", async (req, res) => {
  if (!req.fanUser) return res.redirect("/fan/login");
  await pool.query("DELETE FROM family_members WHERE id = $1 AND fan_user_id = $2",
    [req.body.memberId, req.fanUser.id]);
  req.session.fanFlash = { type: "success", msg: "Family member removed (their availability responses were cleared)." };
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
  const sqId = await resolveSquadId(team.id, req.body.squadId);
  let flash;
  try {
    await pool.query(
      "INSERT INTO subscribers (team_id, email, fan_user_id, squad_id) VALUES ($1, $2, $3, $4)",
      [team.id, fanEmail, req.fanUser.id, sqId]
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

// One-tap RSVP from email links — token-signed, no login needed
app.get("/rsvp", async (req, res) => {
  const { uid, email, status, token } = req.query;
  if (!uid || !email || !token || !["going", "maybe", "no"].includes(status)) {
    return res.status(400).send("Invalid RSVP link.");
  }

  const expected = rsvpToken(uid, email);
  const a = Buffer.from(String(token));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !nodeCrypto.timingSafeEqual(a, b)) {
    return res.status(403).send("This RSVP link is not valid.");
  }

  const { rows } = await pool.query(
    `SELECT f.*, t.name AS team_name, t.slug AS team_slug
     FROM fixtures f JOIN teams t ON t.id = f.team_id WHERE f.uid = $1`, [uid]
  );
  if (!rows.length) return res.status(404).send("Event not found.");
  const event = rows[0];

  // Link to a fan account if one exists for this email
  const { rows: fans } = await pool.query("SELECT id FROM fan_users WHERE email = $1", [email]);
  const fanId = fans.length ? fans[0].id : null;

  await pool.query(
    `INSERT INTO availability (fixture_id, email, fan_user_id, status, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (fixture_id, email, COALESCE(family_member_id, 0))
     DO UPDATE SET status = $4, fan_user_id = COALESCE($3, availability.fan_user_id), updated_at = NOW()`,
    [event.id, email, fanId, status]
  );

  const labels = { going: "✓ Going", maybe: "? Maybe", no: "✗ Can't Attend" };
  const colors = { going: "#1a7a2e", maybe: "#b8860b", no: "#aa2222" };
  const when = fmtShort(event.start_time);
  const otherBtn = (s) => status === s ? "" : `
    <a href="/rsvp?${new URLSearchParams({ uid, email, status: s, token: rsvpToken(uid, email) })}"
       style="display:inline-block;border:1px solid #d1d5db;color:#6b7280;text-decoration:none;font-size:0.78rem;
              font-weight:700;padding:8px 16px;border-radius:16px;margin:0 4px">${labels[s]}</a>`;

  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"><title>RSVP — ${event.team_name}</title></head>
    <body style="background:#eef0f4;color:#111827;font-family:'Inter',Arial,sans-serif;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 8px 30px rgba(16,24,40,0.08);max-width:440px;width:100%;padding:36px 30px;text-align:center;border-top:3px solid ${colors[status]}">
        <div style="font-size:2.4rem;margin-bottom:10px">${status === "going" ? "✅" : status === "maybe" ? "🤔" : "👋"}</div>
        <h2 style="margin:0 0 6px;font-size:1.1rem;text-transform:uppercase;letter-spacing:1px">Response saved</h2>
        <p style="color:#999;font-size:0.9rem;margin:0 0 18px">You're marked as
          <strong style="color:${colors[status]}">${labels[status]}</strong> for:</p>
        <p style="font-weight:900;font-size:1rem;margin:0 0 4px">${event.summary}</p>
        <p style="color:#888;font-size:0.82rem;margin:0 0 22px">${when}${event.location ? ` — ${event.location}` : ""}</p>
        <p style="color:#666;font-size:0.75rem;margin:0 0 10px">Changed your mind?</p>
        <div style="margin-bottom:24px">${otherBtn("going")}${otherBtn("maybe")}${otherBtn("no")}</div>
        <a href="/${event.team_slug}" style="color:#cc0000;font-size:0.82rem;text-decoration:none;font-weight:700">View all fixtures for ${event.team_name} →</a>
      </div>
    </body></html>`);
});

// One-tap RSVP from the public team page (logged-in fans, optionally for a family member)
app.post("/:slug/rsvp", async (req, res) => {
  const { slug } = req.params;
  const { uid, status, note, familyMemberId } = req.body;

  if (!req.fanUser) return res.redirect(`/fan/login?returnTo=/${slug}`);
  if (!["going", "maybe", "no"].includes(status)) return res.redirect(`/${slug}`);

  // If responding for a family member, verify it belongs to this guardian
  let fmId = null;
  if (familyMemberId) {
    const { rows: fm } = await pool.query(
      "SELECT id FROM family_members WHERE id = $1 AND fan_user_id = $2",
      [familyMemberId, req.fanUser.id]);
    if (!fm.length) return res.redirect(`/${slug}`);
    fmId = fm[0].id;
  }

  const { rows } = await pool.query(
    `SELECT f.id FROM fixtures f JOIN teams t ON t.id = f.team_id
     WHERE f.uid = $1 AND t.slug = $2`, [uid, slug]
  );
  if (rows.length) {
    await pool.query(
      `INSERT INTO availability (fixture_id, email, fan_user_id, family_member_id, status, note, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (fixture_id, email, COALESCE(family_member_id, 0))
       DO UPDATE SET status = $5, note = $6, fan_user_id = $3, updated_at = NOW()`,
      [rows[0].id, req.fanUser.email, req.fanUser.id, fmId, status, note || null]
    );
  }
  res.redirect(`/${slug}`);
});

// Team public webpage — must be last so it doesn't swallow other routes
app.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  const { rows: teams } = await pool.query("SELECT * FROM teams WHERE slug = $1", [slug]);
  if (!teams.length) return res.status(404).send("Team not found");

  const team = teams[0];
  const { rows: fixtures } = await pool.query(
    `SELECT f.*, sq.name AS squad_name FROM fixtures f
     LEFT JOIN squads sq ON sq.id = f.squad_id
     WHERE f.team_id = $1 ORDER BY f.start_time ASC`,
    [team.id]
  );
  const { rows: squads } = await pool.query(
    "SELECT * FROM squads WHERE team_id = $1 ORDER BY name", [team.id]
  );

  // Public line-ups (only when the club has opted in)
  let lineupMap = {};
  if (team.show_lineups) {
    const { rows: lineupRows } = await pool.query(
      `SELECT f.uid, p.name FROM lineups l
       JOIN players p ON p.id = l.player_id
       JOIN fixtures f ON f.id = l.fixture_id
       WHERE f.team_id = $1 ORDER BY p.name`, [team.id]);
    lineupRows.forEach(r => {
      lineupMap[r.uid] = lineupMap[r.uid] || [];
      lineupMap[r.uid].push(r.name);
    });
  }

  const host = req.headers.host;
  const calendarUrl = `https://${host}/calendar/${slug}.ics`;

  // Check if logged-in fan is already subscribed to this team
  let isSubscribed = false;
  let rsvpMap = {};
  let familyMembers = [];
  if (req.fanUser) {
    const { rows: sub } = await pool.query(
      "SELECT id FROM subscribers WHERE team_id = $1 AND fan_user_id = $2",
      [team.id, req.fanUser.id]
    );
    isSubscribed = sub.length > 0;

    const { rows: fam } = await pool.query(
      "SELECT * FROM family_members WHERE fan_user_id = $1 ORDER BY created_at", [req.fanUser.id]
    );
    familyMembers = fam;

    // This household's RSVPs per event: { uid: { '0': status, '<familyMemberId>': status } }
    const { rows: rsvps } = await pool.query(
      `SELECT f.uid, a.status, a.family_member_id
       FROM availability a JOIN fixtures f ON f.id = a.fixture_id
       WHERE f.team_id = $1 AND a.email = $2`, [team.id, req.fanUser.email]
    );
    rsvps.forEach(r => {
      rsvpMap[r.uid] = rsvpMap[r.uid] || {};
      rsvpMap[r.uid][String(r.family_member_id || 0)] = r.status;
    });
  }

  // Public going-count per event: { uid: n }
  const { rows: goingRows } = await pool.query(
    `SELECT f.uid, COUNT(*)::int AS n
     FROM availability a JOIN fixtures f ON f.id = a.fixture_id
     WHERE f.team_id = $1 AND a.status = 'going' GROUP BY f.uid`, [team.id]
  );
  const goingCounts = {};
  goingRows.forEach(r => { goingCounts[r.uid] = r.n; });

  const flash = req.session.teamFlash;
  delete req.session.teamFlash;

  res.setHeader("Content-Type", "text/html");
  res.send(teamPage(team, fixtures, calendarUrl, flash, req.fanUser, isSubscribed, rsvpMap, goingCounts, familyMembers, squads, lineupMap));
});

// --- Start ---

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Fixture feed running on port ${PORT}`);
  });
  // Event reminder sweep: shortly after boot, then hourly
  setTimeout(runReminderSweep, 30 * 1000);
  setInterval(runReminderSweep, 60 * 60 * 1000);
});
