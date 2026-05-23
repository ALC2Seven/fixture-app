// Each fixture has a stable UID and a SEQUENCE number.
// To reschedule: update start/end, bump sequence by 1.
// Clients that have already subscribed will see the update on next sync.

const fixtures = [
  {
    uid: "fixture-001@calendar.fixture-app.com",
    sequence: 0,
    summary: "City FC vs United AFC",
    location: "Riverside Stadium, Manchester",
    description: "Premier League — Matchday 12",
    start: new Date("2026-06-07T15:00:00Z"),
    end:   new Date("2026-06-07T17:00:00Z"),
  },
  {
    uid: "fixture-002@calendar.fixture-app.com",
    sequence: 0,
    summary: "Eagles SC vs Rovers United",
    location: "Falcon Park, London",
    description: "Premier League — Matchday 12",
    start: new Date("2026-06-07T17:30:00Z"),
    end:   new Date("2026-06-07T19:30:00Z"),
  },
  {
    uid: "fixture-003@calendar.fixture-app.com",
    sequence: 0,
    summary: "North Town FC vs Bay City Athletic",
    location: "Northern Ground, Leeds",
    description: "Premier League — Matchday 12",
    start: new Date("2026-06-08T14:00:00Z"),
    end:   new Date("2026-06-08T16:00:00Z"),
  },
];

module.exports = fixtures;
