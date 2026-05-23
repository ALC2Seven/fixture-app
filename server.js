// Polyfill crypto for older Node versions (Railway default is Node 16/18)
if (!globalThis.crypto) {
  globalThis.crypto = require("crypto").webcrypto;
}

const express = require("express");
const icalLib = require("ical-generator");
const ical = icalLib.default || icalLib;
const fixtures = require("./fixtures");

const app = express();
const PORT = process.env.PORT || 3000;

// Health check — Railway uses this to confirm the service is up
app.get("/", (req, res) => {
  res.send("Fixture calendar feed is running. Subscribe at /calendar.ics");
});

app.get("/calendar.ics", (req, res) => {
  const calendar = ical({
    name: "Sports Fixtures",
    description: "Live fixture schedule — reschedules propagate automatically",
    // RFC 5545 requires a PRODID
    prodId: { company: "FixtureApp", product: "Sports Calendar", language: "EN" },
    // Tells clients to refresh every 30 minutes
    ttl: 1800,
  });

  for (const fixture of fixtures) {
    const event = calendar.createEvent({
      sequence: fixture.sequence,
      summary: fixture.summary,
      description: fixture.description,
      location: fixture.location,
      start: fixture.start,
      end: fixture.end,
    });
    // uid() must be called as a setter — passing it to the constructor is silently ignored in v10
    event.uid(fixture.uid);
  }

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  // No caching — clients must always fetch the latest version
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Content-Disposition", 'attachment; filename="fixtures.ics"');
  res.send(calendar.toString());
});

app.listen(PORT, () => {
  console.log(`Fixture feed running on port ${PORT}`);
  console.log(`Subscribe: http://localhost:${PORT}/calendar.ics`);
});
