// Type config: row tints + badge colours per theme
const TYPE_CONFIG = {
  dark: {
    league:     { label: "League",     rowBg: "transparent", badge: null },
    cup:        { label: "Cup",        rowBg: "#2a2410",     badge: { bg: "#2a2000", color: "#f0b429", text: "Cup" } },
    tournament: { label: "Tournament", rowBg: "#18222e",     badge: { bg: "#001a2a", color: "#29b6f0", text: "Tournament" } },
    festival:   { label: "Festival",   rowBg: "#1a2218",     badge: { bg: "#0a1a0a", color: "#66bb6a", text: "Festival" } },
  },
  light: {
    league:     { label: "League",     rowBg: "transparent", badge: null },
    cup:        { label: "Cup",        rowBg: "#fffbeb",     badge: { bg: "#92400e", color: "#fef3c7", text: "Cup" } },
    tournament: { label: "Tournament", rowBg: "#eff6ff",     badge: { bg: "#1e40af", color: "#dbeafe", text: "Tournament" } },
    festival:   { label: "Festival",   rowBg: "#f0fdf4",     badge: { bg: "#166534", color: "#dcfce7", text: "Festival" } },
  },
};

function formatDate(date) {
  const d = new Date(date);
  return {
    day:       d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    date:      d.toLocaleDateString("en-GB", { day: "2-digit", timeZone: "UTC" }),
    month:     d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase(),
    year:      d.toLocaleDateString("en-GB", { year: "numeric", timeZone: "UTC" }),
    time:      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }),
    monthYear: d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
    dayKey:    d.toISOString().slice(0, 10),
  };
}

// One fixture row inside a date card: home team | centre block | away team
function fixtureRow(fixture, isNext, theme) {
  const d = formatDate(fixture.start_time);
  const cancelled = fixture.status === "cancelled_shown";
  const type = fixture.fixture_type || "league";
  const themeConfig = TYPE_CONFIG[theme] || TYPE_CONFIG.dark;
  const cfg = themeConfig[type] || themeConfig.league;

  const badgeHtml = cfg.badge
    ? `<span class="pill" style="background:${cfg.badge.bg};color:${cfg.badge.color}">${cfg.badge.text}</span>`
    : "";
  const homeAwayPill = fixture.is_home
    ? `<span class="pill pill-home">Home</span>`
    : `<span class="pill pill-away">Away</span>`;
  const statusPill = cancelled
    ? `<span class="pill pill-cancelled">Cancelled</span>`
    : isNext ? `<span class="pill pill-next">Next Fixture</span>` : "";

  return `
    <div class="fx ${isNext ? "fx-next" : ""} ${cancelled ? "fx-cancelled" : ""}" data-type="${type}"
         style="background:${cfg.rowBg}">
      <div class="fx-team fx-team-home">${fixture.home_team || fixture.summary}</div>
      <div class="fx-centre">
        <div class="fx-pills">${statusPill}${homeAwayPill}${badgeHtml}</div>
        <div class="fx-time">${d.time}</div>
        <div class="fx-venue">${fixture.location || "Venue TBC"}</div>
        ${fixture.description ? `<div class="fx-comp">${fixture.description}</div>` : ""}
      </div>
      <div class="fx-team fx-team-away">${fixture.away_team || ""}</div>
    </div>
  `;
}

// Group fixtures: month header → date cards (tab + card)
function fixtureCards(fixtures, markNextIndex, theme) {
  if (!fixtures.length) return '<div class="empty">No fixtures scheduled.</div>';

  const months = [];
  fixtures.forEach((f, i) => {
    const d = formatDate(f.start_time);
    let month = months[months.length - 1];
    if (!month || month.label !== d.monthYear) {
      month = { label: d.monthYear, days: [] };
      months.push(month);
    }
    let day = month.days[month.days.length - 1];
    if (!day || day.key !== d.dayKey) {
      day = { key: d.dayKey, tab: `${d.day} ${d.date} ${d.month}`, items: [] };
      month.days.push(day);
    }
    day.items.push({ fixture: f, index: i });
  });

  return months.map(month => {
    const cards = month.days.map(day => {
      const rows = day.items
        .map(({ fixture, index }) => fixtureRow(fixture, index === markNextIndex, theme))
        .join("");
      return `
        <div class="date-group">
          <div class="date-tab">${day.tab}</div>
          <div class="date-card">${rows}</div>
        </div>`;
    }).join("");
    return `<div class="month-block"><div class="month-header">${month.label}</div>${cards}</div>`;
  }).join("");
}

// Tab bar — only when more than one type present
function buildTabs(fixtures, theme) {
  const types = [...new Set(fixtures.map(f => f.fixture_type || "league"))];
  if (types.length <= 1) return "";

  const themeConfig = TYPE_CONFIG[theme] || TYPE_CONFIG.dark;
  const tabOrder = ["league", "cup", "tournament", "festival"];
  const presentTypes = tabOrder.filter(t => types.includes(t));

  const buttons = presentTypes.map(t => {
    const cfg = themeConfig[t] || themeConfig.league;
    const count = fixtures.filter(f => (f.fixture_type || "league") === t).length;
    return `<button class="tab-btn" data-tab="${t}" onclick="filterTab('${t}')">${cfg.label} <span class="tab-count">${count}</span></button>`;
  });

  return `
    <div class="tab-bar" id="tab-bar">
      <button class="tab-btn active" data-tab="all" onclick="filterTab('all')">All <span class="tab-count">${fixtures.length}</span></button>
      ${buttons.join("")}
    </div>
  `;
}

function teamPage(team, fixtures, calendarUrl, flash, fanUser, isSubscribed) {
  const now = new Date();
  const visible  = fixtures.filter(f => f.status !== "cancelled_hidden");
  const upcoming = visible.filter(f => new Date(f.start_time) >= now);
  const past     = visible.filter(f => new Date(f.start_time) <  now).reverse();
  const nextIndex = upcoming.length > 0 ? 0 : -1;

  const isPaid = team.tier === "standard" || team.tier === "pro";
  const webcalUrl = `webcal://${calendarUrl.replace(/^https?:\/\//, "")}`;
  const theme = team.theme === "light" ? "light" : "dark";

  const justSubscribed = flash && flash.msg === "subscribed";
  const alreadySubscribed = flash && flash.msg === "already";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${team.name} — Fixtures</title>
  <style>
    :root {
      --bg:        #1e2025;
      --surface:   #262a33;
      --border:    #2e3240;
      --text:      #ffffff;
      --text-2:    #cccccc;
      --text-3:    #888888;
      --text-4:    #666666;
      --month-hdr: #888888;
      --empty:     #555555;
      --shadow:    0 2px 10px rgba(0,0,0,0.35);
      --tab-bg:    #2e3240;
    }
    body.light {
      --bg:        #eef0f4;
      --surface:   #ffffff;
      --border:    #e5e7eb;
      --text:      #111827;
      --text-2:    #374151;
      --text-3:    #6b7280;
      --text-4:    #9ca3af;
      --month-hdr: #6b7280;
      --empty:     #9ca3af;
      --shadow:    0 2px 8px rgba(16,24,40,0.08);
      --tab-bg:    #1b2240;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: Arial, sans-serif; min-height: 100vh; }

    /* Hero */
    .hero {
      background: linear-gradient(to bottom, rgba(10,14,30,0.85), rgba(10,14,30,0.72)),
                  url('https://images.unsplash.com/photo-1552667466-07770ae110d0?w=1200&q=80') center/cover no-repeat;
      padding: 28px 20px 24px; border-bottom: 3px solid #cc0000; text-align: center;
    }
    .hero h1 { font-size: 2.2rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; line-height: 1; font-style: italic; color: #fff; }
    .hero h1 span { color: #cc0000; }
    .hero p { margin: 6px auto 0; color: #aab; font-size: 0.8rem; max-width: 400px; }
    .hero-actions { margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 18px; font-size: 0.78rem; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase; text-decoration: none;
      border: none; cursor: pointer; border-radius: 4px;
    }
    .btn-primary { background: #cc0000; color: #fff; }
    .btn-primary:hover { background: #aa0000; }
    .btn-outline { background: transparent; color: #fff; border: 2px solid #fff; }
    .btn-outline:hover { background: rgba(255,255,255,0.1); }

    /* Social links */
    .social-links { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
    .social-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; font-size: 0.72rem; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase; text-decoration: none;
      border: 1px solid; border-radius: 4px; transition: opacity 0.15s;
    }
    .social-btn:hover { opacity: 0.8; }
    .social-facebook { color: #4d9aff; border-color: #4d9aff; }
    .social-instagram { color: #e1306c; border-color: #e1306c; }
    .social-tiktok { color: #69c9d0; border-color: #69c9d0; }

    /* Section */
    .section { max-width: 920px; margin: 32px auto; padding: 0 20px; }
    .section-title {
      font-size: 0.8rem; font-weight: 900; letter-spacing: 3px;
      text-transform: uppercase; color: #cc0000; font-style: italic;
      padding-bottom: 10px; margin-bottom: 0; text-align: center;
    }

    /* Tab bar */
    .tab-bar {
      display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
      margin: 14px 0 4px;
    }
    .tab-btn {
      background: var(--surface); border: 1px solid var(--border); color: var(--text-3);
      font-size: 0.7rem; font-weight: 700; letter-spacing: 1px;
      text-transform: uppercase; cursor: pointer; border-radius: 20px;
      padding: 7px 16px; transition: all 0.15s;
    }
    .tab-btn:hover { color: var(--text); border-color: var(--text-4); }
    .tab-btn.active { color: #fff; background: #cc0000; border-color: #cc0000; }
    .tab-count {
      background: rgba(0,0,0,0.25); color: inherit; font-size: 0.62rem;
      padding: 1px 6px; border-radius: 8px; font-weight: 700; margin-left: 2px;
    }

    /* Month header */
    .month-header {
      font-size: 0.78rem; font-weight: 900; letter-spacing: 3px;
      text-transform: uppercase; color: var(--month-hdr); font-style: italic;
      padding: 22px 0 4px; text-align: center;
    }

    /* Date card with attached tab */
    .date-group { margin: 16px 0; }
    .date-tab {
      display: inline-block; background: var(--tab-bg); color: #fff;
      font-size: 0.68rem; font-weight: 900; letter-spacing: 1.5px;
      text-transform: uppercase; padding: 8px 18px;
      border-radius: 8px 8px 0 0;
    }
    body.light .date-tab { color: #fff; }
    .date-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 0 10px 10px 10px; box-shadow: var(--shadow);
      overflow: hidden;
    }

    /* Fixture row: home | centre | away */
    .fx {
      display: grid; grid-template-columns: 1fr auto 1fr;
      align-items: center; gap: 16px;
      padding: 18px 24px; border-bottom: 1px solid var(--border);
    }
    .fx:last-child { border-bottom: none; }
    .fx-next { box-shadow: inset 4px 0 0 #cc0000; }
    .fx-cancelled { opacity: 0.55; }

    .fx-team {
      font-size: 1rem; font-weight: 900; text-transform: uppercase;
      letter-spacing: 1px; line-height: 1.25;
    }
    .fx-team-home { text-align: right; }
    .fx-team-away { text-align: left; }

    .fx-centre { text-align: center; min-width: 190px; }
    .fx-pills { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-bottom: 6px; }
    .pill {
      display: inline-block; padding: 2px 9px; font-size: 0.58rem;
      font-weight: 900; letter-spacing: 1px; text-transform: uppercase;
      border-radius: 10px;
    }
    .pill-home { background: #cc0000; color: #fff; }
    .pill-away { background: var(--border); color: var(--text-3); }
    .pill-next { background: #cc0000; color: #fff; }
    .pill-cancelled { background: var(--text-4); color: var(--surface); }
    .fx-time { font-size: 1.5rem; font-weight: 900; letter-spacing: 1px; }
    .fx-venue { font-size: 0.75rem; color: var(--text-3); margin-top: 3px; }
    .fx-comp { font-size: 0.68rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 1px; margin-top: 3px; }

    /* Past toggle */
    .past-toggle {
      background: none; border: none; color: var(--text-4); font-size: 0.78rem;
      font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
      cursor: pointer; padding: 12px 0; display: flex; align-items: center;
      gap: 8px; width: 100%; justify-content: center;
    }
    .past-toggle:hover { color: var(--text-3); }
    #past-fixtures { display: none; }

    /* Subscribe modal */
    .modal-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.85); z-index: 100;
      align-items: center; justify-content: center; padding: 20px;
    }
    .modal-overlay.open { display: flex; }
    .modal {
      background: var(--surface); border-top: 3px solid #cc0000; border-radius: 0 0 10px 10px;
      padding: 32px 28px; width: 100%; max-width: 440px;
    }
    .modal h2 { font-size: 1rem; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
    .modal p { color: var(--text-3); font-size: 0.85rem; margin-bottom: 20px; line-height: 1.5; }
    .modal-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .modal-actions .btn { flex: 1; justify-content: center; }
    body.light .modal-overlay .btn-outline { color: var(--text); border-color: var(--text); }

    /* Post-signup step */
    .subscribe-success { max-width: 920px; margin: 24px auto 0; padding: 0 20px; }
    .subscribe-success-inner {
      background: #1e2a1e; border: 1px solid #2a4a2a; border-left: 3px solid #4a4;
      border-radius: 8px; padding: 24px 28px; text-align: center;
    }
    body.light .subscribe-success-inner { background: #f0fdf4; border-color: #bbf7d0; border-left-color: #22c55e; }
    .subscribe-success-inner .tick { font-size: 1.8rem; margin-bottom: 10px; }
    .subscribe-success-inner h3 { font-size: 0.9rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #8d8; margin-bottom: 6px; }
    body.light .subscribe-success-inner h3 { color: #166534; }
    .subscribe-success-inner p { color: var(--text-3); font-size: 0.85rem; margin-bottom: 20px; }

    /* Empty state */
    .empty { color: var(--empty); font-size: 0.9rem; padding: 30px 20px; text-align: center; }

    /* Footer */
    footer { text-align: center; padding: 40px 20px; color: var(--text-4); font-size: 0.75rem; letter-spacing: 1px; }

    /* Flash (non-success) */
    .team-flash { max-width: 920px; margin: 16px auto 0; padding: 0 20px; }
    .team-flash-inner { padding: 12px 18px; font-size: 0.85rem; font-weight: 700; border-left: 3px solid; border-radius: 6px; }
    .team-flash-inner.info  { background: #1a1f2a; border-color: #448; color: #88d; }
    .team-flash-inner.error { background: #2a1a1a; border-color: #a44; color: #d88; }
    body.light .team-flash-inner.info  { background: #eff6ff; border-color: #3b82f6; color: #1d4ed8; }
    body.light .team-flash-inner.error { background: #fff0f0; border-color: #cc0000; color: #aa0000; }

    @media (max-width: 640px) {
      .hero h1 { font-size: 1.6rem; letter-spacing: 2px; }
      .hero p { font-size: 0.75rem; }
      .section { padding: 0 12px; margin: 24px auto; }
      .fx {
        grid-template-columns: 1fr; gap: 8px;
        padding: 16px 16px; text-align: center;
      }
      .fx-team-home, .fx-team-away { text-align: center; }
      .fx-team { font-size: 0.85rem; }
      .fx-team-home::after { content: "vs"; display: block; color: #cc0000; font-size: 0.7rem; font-weight: 900; margin-top: 6px; }
      .fx-centre { order: 3; min-width: 0; }
      .fx-team-home { order: 1; }
      .fx-team-away { order: 2; }
      .fx-time { font-size: 1.2rem; }
      .modal { padding: 24px 20px; }
      .subscribe-success { padding: 0 12px; }
      .tab-btn { padding: 6px 12px; font-size: 0.64rem; }
    }
  </style>
</head>
<body${theme === "light" ? ' class="light"' : ''}>

  ${fanUser ? `
  <div style="background:var(--surface);border-bottom:1px solid var(--border);padding:8px 20px;display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-3)">
    <span>Signed in as <strong style="color:var(--text-2)">${fanUser.email}</strong></span>
    <div style="display:flex;gap:16px">
      <a href="/my-teams" style="color:var(--text-2);text-decoration:none">My Teams</a>
      <a href="/fan/logout" style="color:var(--text-3);text-decoration:none">Log out</a>
    </div>
  </div>` : ""}

  <div class="hero">
    <h1>${team.name} <span>Fixtures</span></h1>
    <p>Upcoming and past fixtures for ${team.name}.</p>
    <div class="hero-actions">
      ${isPaid ? (() => {
        if (isSubscribed || justSubscribed) {
          return `<a href="${webcalUrl}" class="btn btn-primary">📅 Add to Calendar</a>
                  <a href="/my-teams" class="btn btn-outline">Manage Subscriptions</a>`;
        } else if (fanUser) {
          return `<form method="POST" action="/${team.slug}/subscribe" style="display:inline">
                    <button type="submit" class="btn btn-primary">📅 Subscribe for Updates</button>
                  </form>`;
        } else {
          return `<button onclick="document.getElementById('subscribe-modal').classList.add('open')" class="btn btn-primary">📅 Subscribe for Updates</button>`;
        }
      })() : ""}
    </div>
    ${(team.facebook_url || team.instagram_url || team.tiktok_url) ? `
    <div class="social-links">
      ${team.facebook_url ? `<a href="${team.facebook_url}" target="_blank" rel="noopener" class="social-btn social-facebook">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        Facebook
      </a>` : ""}
      ${team.instagram_url ? `<a href="${team.instagram_url}" target="_blank" rel="noopener" class="social-btn social-instagram">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
        Instagram
      </a>` : ""}
      ${team.tiktok_url ? `<a href="${team.tiktok_url}" target="_blank" rel="noopener" class="social-btn social-tiktok">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/></svg>
        TikTok
      </a>` : ""}
    </div>` : ""}
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
    <div class="team-flash-inner info">You're already subscribed to ${team.name}. <a href="/my-teams" style="color:inherit">Manage your subscriptions →</a></div>
  </div>` : ""}

  ${flash && flash.type === "error" ? `
  <div class="team-flash">
    <div class="team-flash-inner error">${flash.msg}</div>
  </div>` : ""}

  <div class="section">
    <div class="section-title">Upcoming Fixtures</div>
    ${buildTabs(upcoming, theme)}
    ${past.length > 0 ? `
    <button class="past-toggle" onclick="togglePast(this)">
      <span id="past-arrow">▶</span> Past Fixtures (${past.length})
    </button>
    <div id="past-fixtures">
      ${fixtureCards(past, -1, theme)}
    </div>` : ""}
    <div id="upcoming-rows">
      ${fixtureCards(upcoming, nextIndex, theme)}
    </div>
  </div>

  <footer>POWERED BY FIXTURE APP</footer>

  <!-- Subscribe Modal (shown when not logged in) -->
  ${isPaid && !fanUser ? `
  <div id="subscribe-modal" class="modal-overlay">
    <div class="modal">
      <h2>Subscribe for Updates</h2>
      <p>Get email alerts when ${team.name} reschedule or cancel a fixture, and add their live calendar to your phone — all in one place.</p>
      <p style="color:var(--text-4);font-size:0.8rem;margin-top:-10px;margin-bottom:20px">Free account required — takes 30 seconds.</p>
      <div class="modal-actions">
        <a href="/fan/signup?returnTo=/${team.slug}" class="btn btn-primary">Create Free Account</a>
        <a href="/fan/login?returnTo=/${team.slug}" class="btn btn-outline">Log In</a>
      </div>
      <button type="button" onclick="document.getElementById('subscribe-modal').classList.remove('open')"
        style="background:none;border:none;color:var(--text-4);font-size:0.75rem;cursor:pointer;margin-top:16px;display:block;width:100%;text-align:center">
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

    // Tab filtering — hide fixture rows, then collapse empty date cards and month blocks
    function filterTab(type) {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === type);
      });

      const scope = document.getElementById('upcoming-rows');
      scope.querySelectorAll('.fx').forEach(row => {
        row.style.display = (type === 'all' || row.dataset.type === type) ? '' : 'none';
      });
      scope.querySelectorAll('.date-group').forEach(group => {
        const visible = [...group.querySelectorAll('.fx')].some(r => r.style.display !== 'none');
        group.style.display = visible ? '' : 'none';
      });
      scope.querySelectorAll('.month-block').forEach(block => {
        const visible = [...block.querySelectorAll('.date-group')].some(g => g.style.display !== 'none');
        block.style.display = visible ? '' : 'none';
      });
    }

    // Close modal on backdrop click
    const modal = document.getElementById('subscribe-modal');
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  </script>

</body>
</html>`;
}

module.exports = { teamPage };
