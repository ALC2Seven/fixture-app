// Type config: row colours per theme
const TYPE_CONFIG = {
  dark: {
    league:     { label: "League",     evenBg: "#222630", oddBg: "#282c38", badge: null },
    cup:        { label: "Cup",        evenBg: "#2a2410", oddBg: "#312b14", badge: { bg: "#2a2000", color: "#f0b429", text: "Cup" } },
    tournament: { label: "Tournament", evenBg: "#18222e", oddBg: "#1e2a38", badge: { bg: "#001a2a", color: "#29b6f0", text: "Tournament" } },
    festival:   { label: "Festival",   evenBg: "#1a2218", oddBg: "#202a1e", badge: { bg: "#0a1a0a", color: "#66bb6a", text: "Festival" } },
  },
  light: {
    league:     { label: "League",     evenBg: "#ffffff", oddBg: "#f5f6f8", badge: null },
    cup:        { label: "Cup",        evenBg: "#fffbeb", oddBg: "#fef3c7", badge: { bg: "#92400e", color: "#fef3c7", text: "Cup" } },
    tournament: { label: "Tournament", evenBg: "#eff6ff", oddBg: "#dbeafe", badge: { bg: "#1e40af", color: "#dbeafe", text: "Tournament" } },
    festival:   { label: "Festival",   evenBg: "#f0fdf4", oddBg: "#dcfce7", badge: { bg: "#166534", color: "#dcfce7", text: "Festival" } },
  },
};

function formatDate(date) {
  const d = new Date(date);
  return {
    day:       d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    date:      d.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" }),
    month:     d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase(),
    year:      d.toLocaleDateString("en-GB", { year: "numeric", timeZone: "UTC" }),
    time:      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }),
    monthYear: d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

function fixtureRow(fixture, isNext, isEven, theme) {
  const d = formatDate(fixture.start_time);
  const homeAway = fixture.is_home ? "HOME" : "AWAY";
  const homeAwayColor = fixture.is_home ? "#cc0000" : (theme === "light" ? "#666" : "#888");
  const cancelled = fixture.status === "cancelled_shown";
  const type = fixture.fixture_type || "league";
  const themeConfig = TYPE_CONFIG[theme] || TYPE_CONFIG.dark;
  const cfg = themeConfig[type] || themeConfig.league;

  let rowBg;
  if (cancelled) {
    rowBg = theme === "light" ? "#f5f5f5" : "#1e2025";
  } else if (isNext) {
    rowBg = theme === "light" ? "#fff0f0" : "#2e2535";
  } else {
    rowBg = isEven ? cfg.evenBg : cfg.oddBg;
  }

  const badgeHtml = cfg.badge
    ? `<span class="type-badge" style="background:${cfg.badge.bg};color:${cfg.badge.color}">${cfg.badge.text}</span>`
    : "";

  return `
    <div class="fixture-row ${isNext ? "next-fixture" : ""}" data-type="${type}"
         style="background:${rowBg};${cancelled ? "opacity:0.55;border-left-color:#444" : ""}">
      <div class="fixture-date">
        ${cancelled ? '<div class="next-label" style="background:#444;font-size:0.55rem">CANCELLED</div>' : isNext ? '<div class="next-label">NEXT<br>FIXTURE</div>' : ""}
        <div class="date-block">
          <span class="day">${d.day}</span>
          <span class="date-num">${d.date}</span>
          <span class="month">${d.month} ${d.year}</span>
        </div>
      </div>
      <div class="fixture-details">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="home-away" style="color:${homeAwayColor}">${homeAway}</span>
          ${badgeHtml}
        </div>
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

function fixturesByMonth(fixtures, markNextIndex, theme) {
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
      return fixtureRow(fixture, isNext, isEven, theme);
    }).join("");
    return `<div class="month-group"><div class="month-header">${group.month}</div>${rows}</div>`;
  }).join("");
}

// Build tab bar — only include tabs for types that exist in the fixture list
function buildTabs(fixtures, theme) {
  const types = [...new Set(fixtures.map(f => f.fixture_type || "league"))];
  if (types.length <= 1) return ""; // no tabs if only one type

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
    :root {
      --bg:        #1e2025;
      --surface:   #222630;
      --border:    #2e3240;
      --text:      #ffffff;
      --text-2:    #cccccc;
      --text-3:    #888888;
      --text-4:    #666666;
      --month-hdr: #888888;
      --empty:     #555555;
    }
    body.light {
      --bg:        #f5f6f8;
      --surface:   #ffffff;
      --border:    #e5e7eb;
      --text:      #111827;
      --text-2:    #374151;
      --text-3:    #6b7280;
      --text-4:    #9ca3af;
      --month-hdr: #6b7280;
      --empty:     #9ca3af;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: Arial, sans-serif; min-height: 100vh; }

    /* Hero */
    .hero {
      background: linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.6)),
                  url('https://images.unsplash.com/photo-1552667466-07770ae110d0?w=1200&q=80') center/cover no-repeat;
      padding: 28px 20px 24px; border-bottom: 3px solid #cc0000; text-align: center;
    }
    .hero h1 { font-size: 2.2rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; line-height: 1; }
    .hero h1 span { color: #cc0000; }
    .hero p { margin: 6px auto 0; color: #aaa; font-size: 0.8rem; max-width: 400px; }
    .hero-actions { margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 18px; font-size: 0.78rem; font-weight: 700;
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
      border-bottom: 1px solid var(--border); padding-bottom: 10px;
      margin-bottom: 0; text-align: center;
    }

    /* Social links */
    .social-links { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
    .social-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; font-size: 0.72rem; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase; text-decoration: none;
      border: 1px solid; transition: opacity 0.15s;
    }
    .social-btn:hover { opacity: 0.8; }
    .social-facebook { color: #1877f2; border-color: #1877f2; }
    .social-instagram { color: #e1306c; border-color: #e1306c; }
    .social-tiktok { color: #69c9d0; border-color: #69c9d0; }

    /* Tab bar */
    .tab-bar {
      display: flex; gap: 4px; flex-wrap: wrap; justify-content: center;
      margin-top: 16px; margin-bottom: 4px;
      border-bottom: 1px solid var(--border); padding-bottom: 0;
    }
    .tab-btn {
      background: none; border: none; color: var(--text-3);
      font-size: 0.72rem; font-weight: 700; letter-spacing: 1px;
      text-transform: uppercase; cursor: pointer;
      padding: 8px 14px; border-bottom: 2px solid transparent;
      margin-bottom: -1px; transition: color 0.15s;
    }
    .tab-btn:hover { color: var(--text-2); }
    .tab-btn.active { color: var(--text); border-bottom-color: #cc0000; }
    .tab-count {
      background: var(--border); color: var(--text-3); font-size: 0.6rem;
      padding: 1px 5px; border-radius: 8px; font-weight: 700;
    }
    .tab-btn.active .tab-count { background: #cc0000; color: #fff; }

    /* Month headers */
    .month-group { margin-bottom: 6px; }
    .month-header {
      font-size: 0.7rem; font-weight: 700; letter-spacing: 2px;
      text-transform: uppercase; color: var(--month-hdr); background: var(--bg);
      padding: 12px 20px 8px; border-bottom: 1px solid var(--border);
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
    .clock, .venue { font-size: 0.78rem; color: var(--text-2); }
    .competition { font-size: 0.7rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 1px; }
    .fixture-teams { display: flex; align-items: center; gap: 16px; flex: 1; }
    .team-name { font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .vs { color: #cc0000; font-size: 1.1rem; font-weight: 900; }
    .fixture-row { border-bottom: 1px solid var(--border); }

    /* Type badge */
    .type-badge {
      display: inline-block; padding: 2px 7px; font-size: 0.6rem;
      font-weight: 900; letter-spacing: 1px; text-transform: uppercase;
    }

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
      background: var(--surface); border-top: 3px solid #cc0000;
      padding: 32px 28px; width: 100%; max-width: 440px;
    }
    .modal h2 { font-size: 1rem; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
    .modal p { color: var(--text-3); font-size: 0.85rem; margin-bottom: 20px; line-height: 1.5; }
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
    .empty { color: var(--empty); font-size: 0.9rem; padding: 30px 20px; text-align: center; }

    /* Footer */
    footer { text-align: center; padding: 40px 20px; color: var(--text-4); font-size: 0.75rem; letter-spacing: 1px; }

    /* Flash (non-success) */
    .team-flash { max-width: 860px; margin: 16px auto 0; padding: 0 20px; }
    .team-flash-inner { padding: 12px 18px; font-size: 0.85rem; font-weight: 700; border-left: 3px solid; }
    .team-flash-inner.info  { background: #1a1f2a; border-color: #448; color: #88d; }
    .team-flash-inner.error { background: #2a1a1a; border-color: #a44; color: #d88; }
    body.light .team-flash-inner.info  { background: #eff6ff; border-color: #3b82f6; color: #1d4ed8; }
    body.light .team-flash-inner.error { background: #fff0f0; border-color: #cc0000; color: #aa0000; }

    @media (max-width: 600px) {
      .hero h1 { font-size: 1.6rem; letter-spacing: 2px; }
      .hero p { font-size: 0.75rem; }
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
      .tab-bar { gap: 2px; }
      .tab-btn { padding: 7px 10px; font-size: 0.65rem; }
    }
  </style>
</head>
<body${theme === "light" ? ' class="light"' : ''}>

  ${fanUser ? `
  <div style="background:var(--surface);border-bottom:1px solid var(--border);padding:8px 20px;display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-3)">
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
    <div class="team-flash-inner info">You're already subscribed to ${team.name}. <a href="/my-teams" style="color:#aad">Manage your subscriptions →</a></div>
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
      ${fixturesByMonth(past, -1, theme)}
    </div>` : ""}
    <div id="upcoming-rows">
      ${fixturesByMonth(upcoming, nextIndex, theme)}
    </div>
  </div>

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

    // Tab filtering — show/hide fixture rows and month-groups by type
    function filterTab(type) {
      // Update active tab button
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === type);
      });

      const rows = document.querySelectorAll('#upcoming-rows .fixture-row');
      const monthGroups = document.querySelectorAll('#upcoming-rows .month-group');

      rows.forEach(row => {
        row.style.display = (type === 'all' || row.dataset.type === type) ? '' : 'none';
      });

      // Hide month-group headers when all their rows are hidden
      monthGroups.forEach(group => {
        const visible = [...group.querySelectorAll('.fixture-row')].some(r => r.style.display !== 'none');
        group.style.display = visible ? '' : 'none';
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
