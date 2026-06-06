function formatDate(date) {
  const d = new Date(date);
  return {
    day:      d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    date:     d.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" }),
    month:    d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase(),
    year:     d.toLocaleDateString("en-GB", { year: "numeric", timeZone: "UTC" }),
    time:     d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }),
    monthYear: d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

function fixtureRow(fixture, isNext, isEven) {
  const d = formatDate(fixture.start_time);
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
    return `<div class="month-group"><div class="month-header">${group.month}</div>${rows}</div>`;
  }).join("");
}

function teamPage(team, fixtures, calendarUrl, flash, fanUser, isSubscribed) {
  const now = new Date();
  const visible  = fixtures.filter(f => f.status !== "cancelled_hidden");
  const upcoming = visible.filter(f => new Date(f.start_time) >= now);
  const past     = visible.filter(f => new Date(f.start_time) <  now).reverse();
  const nextIndex = upcoming.length > 0 ? 0 : -1;

  const isPaid = team.tier === "standard" || team.tier === "pro";
  const webcalUrl = `webcal://${calendarUrl.replace(/^https?:\/\//, "")}`;

  // Flash states: "subscribed" = just subscribed, "already" = duplicate
  const justSubscribed = flash && flash.msg === "subscribed";
  const alreadySubscribed = flash && flash.msg === "already";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${team.name} — Fixtures</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #1a1a1a; color: #fff; font-family: Arial, sans-serif; min-height: 100vh; }

    /* Hero */
    .hero {
      background: linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.6)),
                  url('https://images.unsplash.com/photo-1552667466-07770ae110d0?w=1200&q=80') center/cover no-repeat;
      padding: 70px 20px 60px; border-bottom: 3px solid #cc0000; text-align: center;
    }
    .hero h1 { font-size: 3rem; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; line-height: 1; }
    .hero h1 span { color: #cc0000; }
    .hero p { margin: 12px auto 0; color: #aaa; font-size: 0.95rem; max-width: 400px; }
    .hero-actions { margin-top: 24px; display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 24px; font-size: 0.85rem; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase; text-decoration: none;
      border: none; cursor: pointer;
    }
    .btn-primary { background: #cc0000; color: #fff; }
    .btn-primary:hover { background: #aa0000; }
    .btn-outline { background: transparent; color: #fff; border: 2px solid #fff; }
    .btn-outline:hover { background: rgba(255,255,255,0.1); }

    /* Section */
    .section { max-width: 860px; margin: 40px auto; padding: 0 20px; }
    .section-title {
      font-size: 0.8rem; font-weight: 700; letter-spacing: 3px;
      text-transform: uppercase; color: #cc0000;
      border-bottom: 1px solid #333; padding-bottom: 10px;
      margin-bottom: 0; text-align: center;
    }

    /* Month headers */
    .month-group { margin-bottom: 6px; }
    .month-header {
      font-size: 0.7rem; font-weight: 700; letter-spacing: 2px;
      text-transform: uppercase; color: #777; background: #1a1a1a;
      padding: 12px 20px 8px; border-bottom: 1px solid #2e2e2e;
      margin-top: 10px; text-align: center;
    }

    /* Fixture rows */
    .fixture-row {
      display: flex; align-items: center; gap: 20px;
      border-left: 3px solid transparent; padding: 14px 20px;
      transition: border-color 0.15s;
    }
    .fixture-row:hover { border-left-color: #cc0000; }
    .fixture-row.next-fixture { border-left-color: #cc0000; }
    .fixture-date { display: flex; align-items: center; gap: 12px; min-width: 130px; }
    .next-label {
      background: #cc0000; color: #fff; font-size: 0.6rem; font-weight: 900;
      letter-spacing: 1px; text-align: center; padding: 6px 8px; line-height: 1.3;
    }
    .date-block { display: flex; flex-direction: column; }
    .date-block .day   { font-size: 0.7rem; color: #aaa; letter-spacing: 1px; }
    .date-block .date-num { font-size: 1.8rem; font-weight: 900; line-height: 1; }
    .date-block .month { font-size: 0.7rem; color: #cc0000; font-weight: 700; }
    .fixture-details { display: flex; flex-direction: column; gap: 4px; min-width: 160px; }
    .home-away { font-size: 0.7rem; font-weight: 900; letter-spacing: 2px; }
    .match-info { display: flex; flex-direction: column; gap: 2px; }
    .clock, .venue { font-size: 0.78rem; color: #bbb; }
    .competition { font-size: 0.7rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }
    .fixture-teams { display: flex; align-items: center; gap: 16px; flex: 1; }
    .team-name { font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .vs { color: #cc0000; font-size: 1.1rem; font-weight: 900; }

    /* Past toggle */
    .past-toggle {
      background: none; border: none; color: #555; font-size: 0.78rem;
      font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
      cursor: pointer; padding: 12px 0; display: flex; align-items: center;
      gap: 8px; width: 100%; justify-content: center;
    }
    .past-toggle:hover { color: #888; }
    #past-fixtures { display: none; }

    /* Subscribe modal */
    .modal-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.85); z-index: 100;
      align-items: center; justify-content: center; padding: 20px;
    }
    .modal-overlay.open { display: flex; }
    .modal {
      background: #222; border-top: 3px solid #cc0000;
      padding: 32px 28px; width: 100%; max-width: 440px;
    }
    .modal h2 { font-size: 1rem; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
    .modal p { color: #888; font-size: 0.85rem; margin-bottom: 20px; line-height: 1.5; }
    .modal input[type="email"] {
      width: 100%; background: #111; border: 1px solid #333; color: #fff;
      padding: 12px 14px; font-size: 0.9rem; outline: none; margin-bottom: 12px;
    }
    .modal input[type="email"]:focus { border-color: #cc0000; }
    .modal-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .modal-actions .btn { flex: 1; justify-content: center; }

    /* Post-signup step */
    .subscribe-success {
      max-width: 860px; margin: 24px auto 0; padding: 0 20px;
    }
    .subscribe-success-inner {
      background: #1e2a1e; border: 1px solid #2a4a2a; border-left: 3px solid #4a4;
      padding: 24px 28px; text-align: center;
    }
    .subscribe-success-inner .tick { font-size: 1.8rem; margin-bottom: 10px; }
    .subscribe-success-inner h3 { font-size: 0.9rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #8d8; margin-bottom: 6px; }
    .subscribe-success-inner p { color: #888; font-size: 0.85rem; margin-bottom: 20px; }

    /* Empty state */
    .empty { color: #555; font-size: 0.9rem; padding: 30px 20px; text-align: center; }

    /* Footer */
    footer { text-align: center; padding: 40px 20px; color: #666; font-size: 0.75rem; letter-spacing: 1px; }

    /* Flash (non-success) */
    .team-flash { max-width: 860px; margin: 16px auto 0; padding: 0 20px; }
    .team-flash-inner { padding: 12px 18px; font-size: 0.85rem; font-weight: 700; border-left: 3px solid; }
    .team-flash-inner.info  { background: #1a1f2a; border-color: #448; color: #88d; }
    .team-flash-inner.error { background: #2a1a1a; border-color: #a44; color: #d88; }

    @media (max-width: 600px) {
      .hero h1 { font-size: 2rem; letter-spacing: 2px; }
      .hero p { font-size: 0.88rem; }
      .fixture-row { flex-wrap: wrap; gap: 10px; padding: 12px 14px; }
      .fixture-date { min-width: 100px; }
      .date-block .date-num { font-size: 1.5rem; }
      .fixture-details { min-width: 130px; flex: 1; }
      .fixture-teams { flex: 0 0 100%; border-top: 1px solid #333; padding-top: 8px; gap: 8px; justify-content: center; }
      .team-name { font-size: 0.78rem; letter-spacing: 0.5px; }
      .vs { font-size: 0.9rem; }
      .section { padding: 0 12px; }
      .month-header { padding: 10px 14px 6px; }
      .modal { padding: 24px 20px; }
      .subscribe-success { padding: 0 12px; }
    }
  </style>
</head>
<body>

  ${fanUser ? `
  <div style="background:#111;border-bottom:1px solid #222;padding:8px 20px;display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:#555">
    <span>Signed in as <strong style="color:#888">${fanUser.email}</strong></span>
    <div style="display:flex;gap:16px">
      <a href="/my-teams" style="color:#aaa;text-decoration:none">My Teams</a>
      <a href="/fan/logout" style="color:#666;text-decoration:none">Log out</a>
    </div>
  </div>` : ""}

  <div class="hero">
    <h1>${team.name} <span>Fixtures</span></h1>
    <p>Upcoming and past fixtures for ${team.name}.</p>
    <div class="hero-actions">
      ${isPaid ? (() => {
        if (isSubscribed || justSubscribed) {
          // State 3: already subscribed — show calendar button + manage link
          return `<a href="${webcalUrl}" class="btn btn-primary">📅 Add to Calendar</a>
                  <a href="/my-teams" class="btn btn-outline">Manage Subscriptions</a>`;
        } else if (fanUser) {
          // State 2: logged in but not subscribed — one-click subscribe
          return `<form method="POST" action="/${team.slug}/subscribe" style="display:inline">
                    <button type="submit" class="btn btn-primary">📅 Subscribe for Updates</button>
                  </form>`;
        } else {
          // State 1: not logged in — prompt
          return `<button onclick="document.getElementById('subscribe-modal').classList.add('open')" class="btn btn-primary">📅 Subscribe for Updates</button>`;
        }
      })() : ""}
    </div>
  </div>

  ${justSubscribed ? `
  <div class="subscribe-success">
    <div class="subscribe-success-inner">
      <div class="tick">✅</div>
      <h3>You're subscribed!</h3>
      <p>You'll be emailed whenever ${team.name} reschedule or cancel a fixture.<br>Now add the live fixture calendar to your phone:</p>
      <a href="${webcalUrl}" class="btn btn-primary" style="display:inline-flex">📅 Add to Calendar</a>
    </div>
  </div>` : ""}

  ${alreadySubscribed ? `
  <div class="team-flash">
    <div class="team-flash-inner info">You're already subscribed to ${team.name}. <a href="/my-teams" style="color:#aad">Manage your subscriptions →</a></div>
  </div>` : ""}

  ${flash && flash.type === "error" ? `
  <div class="team-flash">
    <div class="team-flash-inner error">${flash.msg}</div>
  </div>` : ""}

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

  <!-- Subscribe Modal (shown when not logged in) -->
  ${isPaid && !fanUser ? `
  <div id="subscribe-modal" class="modal-overlay">
    <div class="modal">
      <h2>Subscribe for Updates</h2>
      <p>Get email alerts when ${team.name} reschedule or cancel a fixture, and add their live calendar to your phone — all in one place.</p>
      <p style="color:#666;font-size:0.8rem;margin-top:-10px;margin-bottom:20px">Free account required — takes 30 seconds.</p>
      <div class="modal-actions">
        <a href="/fan/signup?returnTo=/${team.slug}" class="btn btn-primary">Create Free Account</a>
        <a href="/fan/login?returnTo=/${team.slug}" class="btn btn-outline">Log In</a>
      </div>
      <button type="button" onclick="document.getElementById('subscribe-modal').classList.remove('open')"
        style="background:none;border:none;color:#555;font-size:0.75rem;cursor:pointer;margin-top:16px;display:block;width:100%;text-align:center">
        Cancel
      </button>
    </div>
  </div>` : ""}

  <script>
    function togglePast(btn) {
      const el = document.getElementById('past-fixtures');
      const arrow = document.getElementById('past-arrow');
      const open = el.style.display === 'block';
      el.style.display = open ? 'none' : 'block';
      arrow.textContent = open ? '▶' : '▼';
    }
    // Close modal on backdrop click
    const modal = document.getElementById('subscribe-modal');
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  </script>

</body>
</html>`;
}

module.exports = { teamPage };
