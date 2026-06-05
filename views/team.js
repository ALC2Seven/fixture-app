function formatDate(date) {
  const d = new Date(date);
  return {
    day:   d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase(),
    date:  d.getDate(),
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    year:  d.getFullYear(),
    time:  d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }),
  };
}

function fixtureRow(fixture, isNext) {
  const d = formatDate(fixture.start_time);
  const opponent = fixture.is_home ? fixture.away_team : fixture.home_team;
  const homeAway = fixture.is_home ? "HOME" : "AWAY";
  const homeAwayColor = fixture.is_home ? "#cc0000" : "#888";
  const cancelled = fixture.status === "cancelled_shown";

  return `
    <div class="fixture-row ${isNext ? "next-fixture" : ""}" style="${cancelled ? "opacity:0.55;border-left-color:#555" : ""}">
      <div class="fixture-date">
        ${cancelled ? '<div class="next-label" style="background:#555">CANCELLED</div>' : isNext ? '<div class="next-label">NEXT<br>FIXTURE</div>' : ""}
        <div class="date-block">
          <span class="day">${d.day}</span>
          <span class="date-num">${d.date}</span>
          <span class="month">${d.month} ${d.year}</span>
        </div>
      </div>
      <div class="fixture-details">
        <span class="home-away" style="color:${homeAwayColor}">${homeAway}</span>
        <div class="match-info">
          <span class="clock">🕐 ${d.time}</span>
          <span class="venue">📍 ${fixture.location || "TBC"}</span>
        </div>
        ${fixture.description ? `<span class="competition">${fixture.description}</span>` : ""}
      </div>
      <div class="fixture-teams">
        <span class="team-name">${fixture.home_team || fixture.summary}</span>
        <span class="vs">VS</span>
        <span class="team-name">${fixture.away_team || ""}</span>
      </div>
    </div>
  `;
}

function teamPage(team, fixtures, calendarUrl) {
  const now = new Date();
  const visible  = fixtures.filter(f => f.status !== "cancelled_hidden");
  const upcoming = visible.filter(f => new Date(f.start_time) >= now);
  const past     = visible.filter(f => new Date(f.start_time) <  now);

  const upcomingRows = upcoming.map((f, i) => fixtureRow(f, i === 0)).join("");
  const pastRows     = past.map(f => fixtureRow(f, false)).join("");

  const showCalendarBtn = team.tier === "standard" || team.tier === "pro";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${team.name} — Fixtures</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #111;
      color: #fff;
      font-family: 'Arial', sans-serif;
      min-height: 100vh;
    }

    /* Hero */
    .hero {
      background: linear-gradient(to right, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.4)),
                  url('https://images.unsplash.com/photo-1552667466-07770ae110d0?w=1200&q=80') center/cover no-repeat;
      padding: 60px 40px 50px;
      border-bottom: 3px solid #cc0000;
    }
    .hero h1 {
      font-size: 3rem;
      font-weight: 900;
      letter-spacing: 4px;
      text-transform: uppercase;
      line-height: 1;
    }
    .hero h1 span { color: #cc0000; }
    .hero p {
      margin-top: 12px;
      color: #aaa;
      font-size: 0.95rem;
      max-width: 400px;
    }
    .hero-actions { margin-top: 24px; display: flex; gap: 12px; flex-wrap: wrap; }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      text-decoration: none;
      border: none;
      cursor: pointer;
    }
    .btn-primary { background: #cc0000; color: #fff; }
    .btn-primary:hover { background: #aa0000; }
    .btn-outline { background: transparent; color: #fff; border: 2px solid #fff; }
    .btn-outline:hover { background: rgba(255,255,255,0.1); }

    /* Section */
    .section { max-width: 960px; margin: 40px auto; padding: 0 20px; }
    .section-title {
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #cc0000;
      border-bottom: 1px solid #333;
      padding-bottom: 10px;
      margin-bottom: 0;
    }

    /* Fixture rows */
    .fixture-row {
      display: flex;
      align-items: center;
      gap: 20px;
      background: #1a1a1a;
      border-left: 3px solid #333;
      margin-top: 2px;
      padding: 16px 20px;
      transition: border-color 0.2s;
    }
    .fixture-row:hover { border-left-color: #cc0000; }
    .fixture-row.next-fixture { border-left-color: #cc0000; background: #1f1a1a; }

    .fixture-date {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 130px;
    }
    .next-label {
      background: #cc0000;
      color: #fff;
      font-size: 0.6rem;
      font-weight: 900;
      letter-spacing: 1px;
      text-align: center;
      padding: 6px 8px;
      line-height: 1.3;
    }
    .date-block { display: flex; flex-direction: column; }
    .date-block .day   { font-size: 0.7rem; color: #888; letter-spacing: 1px; }
    .date-block .date-num { font-size: 1.8rem; font-weight: 900; line-height: 1; }
    .date-block .month { font-size: 0.7rem; color: #cc0000; font-weight: 700; }

    .fixture-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 160px;
    }
    .home-away { font-size: 0.7rem; font-weight: 900; letter-spacing: 2px; }
    .match-info { display: flex; flex-direction: column; gap: 2px; }
    .clock, .venue { font-size: 0.78rem; color: #aaa; }
    .competition { font-size: 0.7rem; color: #666; text-transform: uppercase; letter-spacing: 1px; }

    .fixture-teams {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }
    .team-name { font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .vs { color: #cc0000; font-size: 1.1rem; font-weight: 900; }

    /* Empty state */
    .empty { color: #555; font-size: 0.9rem; padding: 30px 20px; text-align: center; }

    /* Footer */
    footer {
      text-align: center;
      padding: 40px 20px;
      color: #444;
      font-size: 0.75rem;
      letter-spacing: 1px;
    }

    @media (max-width: 600px) {
      .hero h1 { font-size: 2rem; }
      .fixture-teams { display: none; }
      .fixture-row { gap: 12px; }
    }
  </style>
</head>
<body>

  <div class="hero">
    <h1>${team.name} <span>Fixtures</span></h1>
    <p>Upcoming and past fixtures for ${team.name}.</p>
    <div class="hero-actions">
      ${showCalendarBtn ? `
        <a href="webcal://${calendarUrl.replace(/^https?:\/\//, "")}" class="btn btn-primary">
          📅 Subscribe to Calendar
        </a>
      ` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Upcoming Fixtures</div>
    ${upcomingRows || '<div class="empty">No upcoming fixtures scheduled.</div>'}
  </div>

  ${past.length > 0 ? `
  <div class="section">
    <div class="section-title">Past Fixtures</div>
    ${pastRows}
  </div>` : ""}

  <footer>POWERED BY FIXTURE APP</footer>

</body>
</html>`;
}

module.exports = { teamPage };
