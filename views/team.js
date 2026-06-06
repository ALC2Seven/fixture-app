function formatDate(date) {
  const d = new Date(date);
  return {
    day:   d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    date:  d.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" }),
    month: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase(),
    monthLong: d.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" }),
    year:  d.toLocaleDateString("en-GB", { year: "numeric", timeZone: "UTC" }),
    time:  d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }),
    monthYear: d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

function fixtureRow(fixture, isNext, isEven) {
  const d = formatDate(fixture.start_time);
  const isActuallyHome = fixture.home_team === fixture.home_team; // always show home/away from data
  const homeAway = fixture.is_home ? "HOME" : "AWAY";
  const homeAwayColor = fixture.is_home ? "#cc0000" : "#888";
  const cancelled = fixture.status === "cancelled_shown";
  const rowBg = cancelled ? "#1e1e1e" : isNext ? "#2a1f1f" : isEven ? "#242424" : "#2c2c2c";

  return `
    <div class="fixture-row ${isNext ? "next-fixture" : ""}" style="background:${rowBg};${cancelled ? "opacity:0.55;border-left-color:#444" : ""}">
      <div class="fixture-date">
        ${cancelled ? '<div class="next-label" style="background:#444;font-size:0.55rem">CANCELLED</div>' : isNext ? '<div class="next-label">NEXT<br>FIXTURE</div>' : ""}
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

// Group fixtures by month and render with month headers
function fixturesByMonth(fixtures, markNextIndex) {
  if (!fixtures.length) return '<div class="empty">No fixtures scheduled.</div>';

  const groups = [];
  let currentMonth = null;
  let currentGroup = [];

  fixtures.forEach((f, i) => {
    const d = formatDate(f.start_time);
    if (d.monthYear !== currentMonth) {
      if (currentGroup.length) groups.push({ month: currentMonth, fixtures: currentGroup });
      currentMonth = d.monthYear;
      currentGroup = [];
    }
    currentGroup.push({ fixture: f, index: i });
  });
  if (currentGroup.length) groups.push({ month: currentMonth, fixtures: currentGroup });

  let evenCounter = 0;
  return groups.map(group => {
    const rows = group.fixtures.map(({ fixture, index }) => {
      const isNext = index === markNextIndex;
      const isEven = evenCounter++ % 2 === 0;
      return fixtureRow(fixture, isNext, isEven);
    }).join("");

    return `
      <div class="month-group">
        <div class="month-header">${group.month}</div>
        ${rows}
      </div>
    `;
  }).join("");
}

function teamPage(team, fixtures, calendarUrl) {
  const now = new Date();
  const visible  = fixtures.filter(f => f.status !== "cancelled_hidden");
  const upcoming = visible.filter(f => new Date(f.start_time) >= now);
  const past     = visible.filter(f => new Date(f.start_time) <  now).reverse();

  // Index of next fixture in the upcoming array (always 0 if any upcoming)
  const nextIndex = upcoming.length > 0 ? 0 : -1;

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
      background: #1a1a1a;
      color: #fff;
      font-family: 'Arial', sans-serif;
      min-height: 100vh;
    }

    /* Hero */
    .hero {
      background: linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.6)),
                  url('https://images.unsplash.com/photo-1552667466-07770ae110d0?w=1200&q=80') center/cover no-repeat;
      padding: 70px 20px 60px;
      border-bottom: 3px solid #cc0000;
      text-align: center;
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
      margin: 12px auto 0;
      color: #aaa;
      font-size: 0.95rem;
      max-width: 400px;
    }
    .hero-actions { margin-top: 24px; display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }

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
    .section { max-width: 860px; margin: 40px auto; padding: 0 20px; }
    .section-title {
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #cc0000;
      border-bottom: 1px solid #333;
      padding-bottom: 10px;
      margin-bottom: 0;
      text-align: center;
    }

    /* Month group header */
    .month-group { margin-bottom: 6px; }
    .month-header {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #777;
      background: #1a1a1a;
      padding: 12px 20px 8px;
      border-bottom: 1px solid #2e2e2e;
      margin-top: 10px;
      text-align: center;
    }

    /* Fixture rows */
    .fixture-row {
      display: flex;
      align-items: center;
      gap: 20px;
      border-left: 3px solid transparent;
      padding: 14px 20px;
      transition: border-color 0.15s, background 0.15s;
    }
    .fixture-row:hover { border-left-color: #cc0000; }
    .fixture-row.next-fixture { border-left-color: #cc0000; }

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
    .date-block .day   { font-size: 0.7rem; color: #aaa; letter-spacing: 1px; }
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
    .clock, .venue { font-size: 0.78rem; color: #bbb; }
    .competition { font-size: 0.7rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }

    .fixture-teams {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }
    .team-name { font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .vs { color: #cc0000; font-size: 1.1rem; font-weight: 900; }

    /* Past fixtures collapsed */
    .past-toggle {
      background: none;
      border: none;
      color: #555;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      cursor: pointer;
      padding: 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      justify-content: center;
    }
    .past-toggle:hover { color: #888; }
    #past-fixtures { display: none; }

    /* Empty state */
    .empty { color: #555; font-size: 0.9rem; padding: 30px 20px; text-align: center; }

    /* Footer */
    footer {
      text-align: center;
      padding: 40px 20px;
      color: #666;
      font-size: 0.75rem;
      letter-spacing: 1px;
    }

    @media (max-width: 600px) {
      .hero h1 { font-size: 2rem; letter-spacing: 2px; }
      .hero p { font-size: 0.88rem; }

      .fixture-row { flex-wrap: wrap; gap: 10px; padding: 12px 14px; }

      .fixture-date { min-width: 100px; }
      .date-block .date-num { font-size: 1.5rem; }

      .fixture-details { min-width: 130px; flex: 1; }

      .fixture-teams {
        flex: 0 0 100%;
        border-top: 1px solid #333;
        padding-top: 8px;
        gap: 8px;
        justify-content: center;
      }
      .team-name { font-size: 0.78rem; letter-spacing: 0.5px; }
      .vs { font-size: 0.9rem; }

      .section { padding: 0 12px; }
      .month-header { padding: 10px 14px 6px; }
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
    ${fixturesByMonth(upcoming, nextIndex)}
  </div>

  ${past.length > 0 ? `
  <div class="section">
    <button class="past-toggle" onclick="togglePast(this)">
      <span id="past-arrow">▶</span> Past Fixtures (${past.length})
    </button>
    <div id="past-fixtures">
      ${fixturesByMonth(past, -1)}
    </div>
  </div>` : ""}

  <footer>POWERED BY FIXTURE APP</footer>

  <script>
    function togglePast(btn) {
      const el = document.getElementById('past-fixtures');
      const arrow = document.getElementById('past-arrow');
      const open = el.style.display === 'block';
      el.style.display = open ? 'none' : 'block';
      arrow.textContent = open ? '▶' : '▼';
    }
  </script>

</body>
</html>`;
}

module.exports = { teamPage };
