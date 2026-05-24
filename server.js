// Polyfill crypto for older Node versions (Railway default is Node 16/18)
if (!globalThis.crypto) {
  globalThis.crypto = require("crypto").webcrypto;
}

const express = require("express");
const fs = require("fs");
const path = require("path");
const icalLib = require("ical-generator");
const ical = icalLib.default || icalLib;
const { Resend } = require("resend");

const app = express();
const PORT = process.env.PORT || 3000;
const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_KEY = process.env.ADMIN_KEY || "changeme";

const FIXTURES_PATH = path.join(__dirname, "data", "fixtures.json");
const SUBSCRIBERS_PATH = path.join(__dirname, "data", "subscribers.json");

app.use(express.json());

// --- Helpers ---

function loadFixtures() {
  return JSON.parse(fs.readFileSync(FIXTURES_PATH, "utf8"));
}

function saveFixtures(fixtures) {
  fs.writeFileSync(FIXTURES_PATH, JSON.stringify(fixtures, null, 2));
}

function loadSubscribers() {
  return JSON.parse(fs.readFileSync(SUBSCRIBERS_PATH, "utf8"));
}

function requireAdminKey(req, res, next) {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorised" });
  }
  next();
}

// --- Routes ---

// Health check
app.get("/", (req, res) => {
  res.send("Fixture calendar feed is running. Subscribe at /calendar.ics");
});

// ICS calendar feed
app.get("/calendar.ics", (req, res) => {
  const fixtures = loadFixtures();

  const calendar = ical({
    name: "Sports Fixtures",
    description: "Live fixture schedule — reschedules propagate automatically",
    prodId: { company: "FixtureApp", product: "Sports Calendar", language: "EN" },
    ttl: 1800,
  });

  for (const fixture of fixtures) {
    const event = calendar.createEvent({
      sequence: fixture.sequence,
      summary: fixture.summary,
      description: fixture.description,
      location: fixture.location,
      start: new Date(fixture.start),
      end: new Date(fixture.end),
    });
    event.uid(fixture.uid);
  }

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(calendar.toString());
});

// Admin: reschedule a fixture + email all subscribers
app.post("/admin/reschedule", requireAdminKey, async (req, res) => {
  const { uid, newStart, newEnd, reason } = req.body;

  if (!uid || !newStart || !newEnd) {
    return res.status(400).json({ error: "uid, newStart and newEnd are required" });
  }

  const fixtures = loadFixtures();
  const fixture = fixtures.find(f => f.uid === uid);

  if (!fixture) {
    return res.status(404).json({ error: `No fixture found with uid: ${uid}` });
  }

  // Store old date for the email
  const oldStart = fixture.start;

  // Apply the reschedule
  fixture.start = newStart;
  fixture.end = newEnd;
  fixture.sequence += 1;
  if (!fixture.description.includes("RESCHEDULED")) {
    fixture.description += " (RESCHEDULED)";
  }

  saveFixtures(fixtures);

  // Format dates nicely for the email
  const fmt = iso => new Date(iso).toUTCString().replace(" GMT", " UTC");

  // Send emails to all subscribers
  const subscribers = loadSubscribers();

  const emailResult = await resend.emails.send({
    from: "Fixture Updates <onboarding@resend.dev>",
    to: subscribers,
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
          <td style="padding:8px"><strong>${fmt(newStart)}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px;color:#666">Venue:</td>
          <td style="padding:8px">${fixture.location}</td>
        </tr>
        ${reason ? `<tr><td style="padding:8px;color:#666">Reason:</td><td style="padding:8px">${reason}</td></tr>` : ""}
      </table>
      <p style="color:#666;font-size:12px">Your calendar will update automatically. No action needed.</p>
    `,
  });

  res.json({
    success: true,
    fixture,
    emailsSent: subscribers.length,
    emailResult,
  });
});

// Admin: add a subscriber
app.post("/admin/subscribers", requireAdminKey, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  const subscribers = loadSubscribers();
  if (subscribers.includes(email)) {
    return res.status(409).json({ error: "Already subscribed" });
  }

  subscribers.push(email);
  fs.writeFileSync(SUBSCRIBERS_PATH, JSON.stringify(subscribers, null, 2));
  res.json({ success: true, subscribers });
});

app.listen(PORT, () => {
  console.log(`Fixture feed running on port ${PORT}`);
  console.log(`Subscribe: http://localhost:${PORT}/calendar.ics`);
});
