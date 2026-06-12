// Type config: row tints + badge colours per theme.
// Keys cover both fixture types (league/cup/tournament/festival)
// and event kinds (training/meeting/social/duty).
const TYPE_CONFIG = {
  dark: {
    league:     { label: "League",     rowBg: "transparent", badge: null },
    cup:        { label: "Cup",        rowBg: "#2a2410",     badge: { bg: "#2a2000", color: "#f0b429", text: "Cup" } },
    tournament: { label: "Tournament", rowBg: "#18222e",     badge: { bg: "#001a2a", color: "#29b6f0", text: "Tournament" } },
    festival:   { label: "Festival",   rowBg: "#1a2218",     badge: { bg: "#0a1a0a", color: "#66bb6a", text: "Festival" } },
    training:   { label: "Training",   rowBg: "#1f1a2e",     badge: { bg: "#1f1530", color: "#b794f6", text: "Training" } },
    meeting:    { label: "Meetings",   rowBg: "#1a2026",     badge: { bg: "#1a2530", color: "#7ab8d9", text: "Meeting" } },
    social:     { label: "Social",     rowBg: "#261a20",     badge: { bg: "#2a1520", color: "#f687b3", text: "Social" } },
    duty:       { label: "Duties",     rowBg: "#102225",     badge: { bg: "#0a2025", color: "#4fd1c5", text: "Duty" } },
  },
  light: {
    league:     { label: "League",     rowBg: "transparent", badge: null },
    cup:        { label: "Cup",        rowBg: "#fffbeb",     badge: { bg: "#92400e", color: "#fef3c7", text: "Cup" } },
    tournament: { label: "Tournament", rowBg: "#eff6ff",     badge: { bg: "#1e40af", color: "#dbeafe", text: "Tournament" } },
    festival:   { label: "Festival",   rowBg: "#f0fdf4",     badge: { bg: "#166534", color: "#dcfce7", text: "Festival" } },
    training:   { label: "Training",   rowBg: "#faf5ff",     badge: { bg: "#6b21a8", color: "#f3e8ff", text: "Training" } },
    meeting:    { label: "Meetings",   rowBg: "#f0f7fb",     badge: { bg: "#155e75", color: "#cffafe", text: "Meeting" } },
    social:     { label: "Social",     rowBg: "#fdf2f8",     badge: { bg: "#9d174d", color: "#fce7f3", text: "Social" } },
    duty:       { label: "Duties",     rowBg: "#f0fdfa",     badge: { bg: "#115e59", color: "#ccfbf1", text: "Duty" } },
  },
};

// Filter/tint key for an item: fixtures use fixture_type, events use event_kind
function typeKey(f) {
  return (f.event_kind && f.event_kind !== "fixture") ? f.event_kind : (f.fixture_type || "league");
}

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

// RSVP button strip for an upcoming event (logged-in fans only).
// One row per person: the account holder plus each family member.
function rsvpStrip(fixture, ctx) {
  if (!ctx || !ctx.fanUser) return "";
  if (fixture.status && fixture.status.startsWith("cancelled")) return "";
  if (new Date(fixture.start_time) < new Date()) return "";

  const responses = ctx.rsvpMap[fixture.uid] || {};
  const going = ctx.goingCounts[fixture.uid] || 0;
  const family = ctx.familyMembers || [];

  const people = [
    { id: 0, label: family.length ? "You" : "Your availability:" },
    ...family.map(m => ({ id: m.id, label: m.name })),
  ];

  const btn = (personId, status, label, cls) => `
    <form method="POST" action="/${ctx.slug}/rsvp" style="display:inline">
      <input type="hidden" name="uid" value="${fixture.uid}">
      <input type="hidden" name="status" value="${status}">
      ${personId ? `<input type="hidden" name="familyMemberId" value="${personId}">` : ""}
      <button type="submit" class="rsvp-btn ${cls} ${responses[String(personId)] === status ? "rsvp-on" : ""}">${label}</button>
    </form>`;

  const rows = people.map(p => `
    <div class="rsvp-person">
      <span class="rsvp-label">${p.label}</span>
      ${btn(p.id, "going", "✓ Going", "rsvp-going")}
      ${btn(p.id, "maybe", "? Maybe", "rsvp-maybe")}
      ${btn(p.id, "no", "✗ Can't", "rsvp-no")}
    </div>`).join("");

  return `
    <div class="fx-rsvp ${family.length ? "fx-rsvp-family" : ""}">
      ${rows}
      ${going > 0 ? `<span class="rsvp-count">${going} going</span>` : ""}
    </div>`;
}

// One row inside a date card.
// Fixtures: home team | centre block | away team. Events: single centred block.
function fixtureRow(fixture, isNext, theme, ctx) {
  const d = formatDate(fixture.start_time);
  const cancelled = fixture.status === "cancelled_shown";
  const isEvent = fixture.event_kind && fixture.event_kind !== "fixture";
  const key = typeKey(fixture);
  const themeConfig = TYPE_CONFIG[theme] || TYPE_CONFIG.dark;
  const cfg = themeConfig[key] || themeConfig.league;

  // Outline badge: use the vivid accent for both text and border, no fill.
  // (dark theme's accent is badge.color; light theme's is the deeper badge.bg)
  const badgeAccent = theme === "light" ? cfg.badge?.bg : cfg.badge?.color;
  const badgeHtml = cfg.badge
    ? `<span class="pill" style="color:${badgeAccent}">${cfg.badge.text}</span>`
    : "";
  const homeAwayPill = isEvent ? "" : (fixture.is_home
    ? `<span class="pill pill-home">Home</span>`
    : `<span class="pill pill-away">Away</span>`);
  const statusPill = cancelled
    ? `<span class="pill pill-cancelled">Cancelled</span>` : "";

  const squadPill = fixture.squad_name
    ? `<span class="pill pill-squad">${fixture.squad_name}</span>` : "";

  // Played match: show the score instead of kick-off time
  const hasResult = !isEvent && fixture.home_score !== null && fixture.home_score !== undefined;
  let outcomePill = "";
  let centreMain = `<div class="fx-time">${d.time}</div>`;
  let resultExtras = "";
  if (hasResult) {
    const clubScore = fixture.is_home ? fixture.home_score : fixture.away_score;
    const oppScore  = fixture.is_home ? fixture.away_score : fixture.home_score;
    const outcome = clubScore > oppScore ? "W" : clubScore < oppScore ? "L" : "D";
    outcomePill = `<span class="pill pill-${outcome.toLowerCase()}">${outcome === "W" ? "Win" : outcome === "L" ? "Loss" : "Draw"}</span>`;
    centreMain = `
      <div class="fx-ft">Full Time</div>
      <div class="fx-score">${fixture.home_score}<span class="fx-score-sep">–</span>${fixture.away_score}</div>`;
    resultExtras = `
      ${fixture.scorers ? `<div class="fx-scorers">⚽ ${fixture.scorers}</div>` : ""}
      ${fixture.match_report ? `
      <details class="fx-report">
        <summary>Match report</summary>
        <p>${String(fixture.match_report).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\r?\n/g, "<br>")}</p>
      </details>` : ""}`;
  }

  if (isEvent) {
    return `
    <div class="fx fx-event ${cancelled ? "fx-cancelled" : ""}" data-type="${key}" data-squad="${fixture.squad_id || 0}"
         style="background:${cfg.rowBg}">
      <div class="fx-centre">
        <div class="fx-pills">${statusPill}${squadPill}${badgeHtml}</div>
        <div class="fx-event-title">${fixture.summary}</div>
        <div class="fx-time">${d.time}</div>
        <div class="fx-venue">${fixture.location || "Venue TBC"}</div>
        ${fixture.description ? `<div class="fx-comp">${fixture.description}</div>` : ""}
      </div>
      ${rsvpStrip(fixture, ctx)}
    </div>`;
  }

  return `
    <div class="fx ${isNext ? "fx-next" : ""} ${cancelled ? "fx-cancelled" : ""}" data-type="${key}" data-squad="${fixture.squad_id || 0}"
         style="background:${cfg.rowBg}">
      <div class="fx-team fx-team-home">${fixture.home_team || fixture.summary}</div>
      <div class="fx-centre">
        <div class="fx-pills">${statusPill}${outcomePill}${homeAwayPill}${squadPill}${badgeHtml}</div>
        ${centreMain}
        <div class="fx-venue">${fixture.location || "Venue TBC"}</div>
        ${fixture.description ? `<div class="fx-comp">${fixture.description}</div>` : ""}
        ${resultExtras}
        ${(ctx && ctx.lineupMap && ctx.lineupMap[fixture.uid]) ? `
        <details class="fx-report">
          <summary>Line-up (${ctx.lineupMap[fixture.uid].length})</summary>
          <p>${ctx.lineupMap[fixture.uid].join(" · ")}</p>
        </details>` : ""}
      </div>
      <div class="fx-team fx-team-away">${fixture.away_team || ""}</div>
      ${rsvpStrip(fixture, ctx)}
    </div>
  `;
}

// Group fixtures: month header → date cards (tab + card)
function fixtureCards(fixtures, markNextIndex, theme, ctx) {
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
      const hasNext = markNextIndex >= 0 && day.items.some(({ index }) => index === markNextIndex);
      const hasCancelled = day.items.some(({ fixture }) => fixture.status === "cancelled_shown");
      const rows = day.items
        .map(({ fixture, index }) => fixtureRow(fixture, index === markNextIndex, theme, ctx))
        .join("");
      return `
        <div class="date-group">
          <div class="date-tab-row">
            <div class="date-tab">${day.tab}</div>
            <div class="date-flags">
              ${hasNext ? `<div class="next-tab">Next Fixture</div>` : ""}
              ${hasCancelled ? `<div class="cancelled-tab">Cancelled</div>` : ""}
            </div>
          </div>
          <div class="date-card${hasNext ? " has-next" : ""}${hasCancelled ? " has-cancelled" : ""}">${rows}</div>
        </div>`;
    }).join("");
    return `<div class="month-block"><div class="month-header">${month.label}</div>${cards}</div>`;
  }).join("");
}

// Simplified tab groups. All = every actual game (no events); League / Other
// (cups, tournaments, festivals) split the games; Events holds every event kind
// on its own. Plus a Stats tab when there are played matches.
const TAB_GROUPS = {
  all:    ["league", "cup", "tournament", "festival"],
  league: ["league"],
  other:  ["cup", "tournament", "festival"],
  events: ["training", "meeting", "social", "duty"],
};

function buildTabs(fixtures, hasStats) {
  const counts = {
    all:    fixtures.filter(f => TAB_GROUPS.all.includes(typeKey(f))).length,
    league: fixtures.filter(f => TAB_GROUPS.league.includes(typeKey(f))).length,
    other:  fixtures.filter(f => TAB_GROUPS.other.includes(typeKey(f))).length,
    events: fixtures.filter(f => TAB_GROUPS.events.includes(typeKey(f))).length,
  };
  // Sub-groups worth showing as their own tab
  const presentGroups = ["league", "other", "events"].filter(g => counts[g] > 0);
  if (presentGroups.length <= 1 && !hasStats) return "";

  const labels = { league: "League", other: "Other", events: "Events" };
  const groupButtons = presentGroups.map(g =>
    `<button class="tab-btn" data-tab="${g}" onclick="filterTab('${g}')">${labels[g]} <span class="tab-count">${counts[g]}</span></button>`
  ).join("");

  return `
    <div class="tab-bar" id="tab-bar">
      <button class="tab-btn active" data-tab="all" onclick="filterTab('all')">All <span class="tab-count">${counts.all}</span></button>
      ${groupButtons}
      ${hasStats ? `<button class="tab-btn tab-stats" data-tab="stats" onclick="filterTab('stats')">📊 Stats</button>` : ""}
    </div>
  `;
}

// Squad filter pills — shown when the club runs more than one squad
function buildSquadTabs(fixtures, squads) {
  if (!squads || !squads.length) return "";
  const usedSquadIds = new Set(fixtures.map(f => f.squad_id).filter(Boolean));
  const present = squads.filter(s => usedSquadIds.has(s.id));
  if (!present.length) return "";

  return `
    <div class="tab-bar squad-bar" id="squad-bar">
      <button class="tab-btn squad-btn active" data-squad="all" onclick="filterSquad('all')">All Squads</button>
      ${present.map(s => `<button class="tab-btn squad-btn" data-squad="${s.id}" onclick="filterSquad('${s.id}')">${s.name}</button>`).join("")}
    </div>
  `;
}

// Played-match extraction shared by the stats panel
function getPlayedMatches(fixtures) {
  return fixtures
    .filter(f =>
      (!f.event_kind || f.event_kind === "fixture") &&
      !String(f.status || "").startsWith("cancelled") &&
      f.home_score !== null && f.home_score !== undefined)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}

function recordOf(matches) {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  const formArr = [];
  for (const f of matches) {
    const cs = f.is_home ? f.home_score : f.away_score;
    const os = f.is_home ? f.away_score : f.home_score;
    gf += cs; ga += os;
    const o = cs > os ? "W" : cs < os ? "L" : "D";
    if (o === "W") w++; else if (o === "L") l++; else d++;
    formArr.push(o);
  }
  return { p: matches.length, w, d, l, gf, ga, form: formArr.slice(-5) };
}

// W/D/L proportion bar
function wdlBar(r) {
  if (!r.p) return `<div class="bar"><span style="flex:1;background:var(--border)"></span></div>`;
  return `
    <div class="bar">
      ${r.w ? `<span style="flex:${r.w};background:#1a7a2e"></span>` : ""}
      ${r.d ? `<span style="flex:${r.d};background:#b8860b"></span>` : ""}
      ${r.l ? `<span style="flex:${r.l};background:#aa2222"></span>` : ""}
    </div>`;
}

// Stats panel — shown via the Stats tab
function buildStatsPanel(fixtures) {
  const played = getPlayedMatches(fixtures);
  if (!played.length) return "";

  const all  = recordOf(played);
  const home = recordOf(played.filter(f => f.is_home));
  const away = recordOf(played.filter(f => !f.is_home));
  const goalMax = Math.max(all.gf, all.ga, 1);

  const recordRow = (label, r) => `
    <div class="stat-row">
      <div class="stat-row-head">
        <span class="stat-row-label">${label}</span>
        <span class="stat-row-detail">P ${r.p} · <em class="c-w">W ${r.w}</em> · <em class="c-d">D ${r.d}</em> · <em class="c-l">L ${r.l}</em></span>
      </div>
      ${wdlBar(r)}
    </div>`;

  return `
    <div id="stats-panel" style="display:none">
      <div class="stats-grid">

        <div class="stat-card">
          <div class="stat-card-title">Season Record</div>
          <div class="big-record">
            <div class="big-stat"><strong>${all.p}</strong><span>Played</span></div>
            <div class="big-stat c-w"><strong>${all.w}</strong><span>Won</span></div>
            <div class="big-stat c-d"><strong>${all.d}</strong><span>Drawn</span></div>
            <div class="big-stat c-l"><strong>${all.l}</strong><span>Lost</span></div>
          </div>
          <div class="sr-form" style="justify-content:center;margin-top:14px">
            <span class="sr-form-label">Form</span>
            ${all.form.map(o => `<span class="form-dot form-${o.toLowerCase()}">${o}</span>`).join("")}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-title">Home vs Away</div>
          ${recordRow("Home", home)}
          ${recordRow("Away", away)}
        </div>

        <div class="stat-card">
          <div class="stat-card-title">Goals</div>
          <div class="stat-row">
            <div class="stat-row-head">
              <span class="stat-row-label">Scored</span>
              <span class="stat-row-detail c-w">${all.gf}</span>
            </div>
            <div class="bar"><span style="flex:${all.gf || 0.001};background:#1a7a2e"></span><span style="flex:${goalMax - all.gf || 0.001};background:var(--border)"></span></div>
          </div>
          <div class="stat-row">
            <div class="stat-row-head">
              <span class="stat-row-label">Conceded</span>
              <span class="stat-row-detail c-l">${all.ga}</span>
            </div>
            <div class="bar"><span style="flex:${all.ga || 0.001};background:#aa2222"></span><span style="flex:${goalMax - all.ga || 0.001};background:var(--border)"></span></div>
          </div>
          <div class="stat-row">
            <div class="stat-row-head">
              <span class="stat-row-label">Goal difference</span>
              <span class="stat-row-detail" style="font-weight:900;color:${all.gf - all.ga > 0 ? "#1a7a2e" : all.gf - all.ga < 0 ? "#aa2222" : "var(--text-3)"}">${all.gf - all.ga > 0 ? "+" : ""}${all.gf - all.ga}</span>
            </div>
          </div>
        </div>

      </div>
    </div>`;
}

function teamPage(team, fixtures, calendarUrl, flash, fanUser, isSubscribed, rsvpMap, goingCounts, familyMembers, squads, lineupMap) {
  squads = squads || [];
  const ctx = { fanUser, slug: team.slug, rsvpMap: rsvpMap || {}, goingCounts: goingCounts || {}, familyMembers: familyMembers || [], lineupMap: lineupMap || {} };
  const now = new Date();
  const visible  = fixtures.filter(f => f.status !== "cancelled_hidden");
  const upcoming = visible.filter(f => new Date(f.start_time) >= now);
  // Oldest → newest so past games flow chronologically into the upcoming list
  const past     = visible.filter(f => new Date(f.start_time) <  now);
  const nextIndex = upcoming.length > 0 ? 0 : -1;

  const isPaid = team.tier === "standard" || team.tier === "pro";
  const webcalUrl = `webcal://${calendarUrl.replace(/^https?:\/\//, "")}`;
  const googleCalUrl  = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
  const outlookCalUrl = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(calendarUrl)}&name=${encodeURIComponent(team.name + " Fixtures")}`;
  // Light is the default; only an explicit dark choice renders dark
  const theme = team.theme === "dark" ? "dark" : "light";

  const justSubscribed = flash && flash.msg === "subscribed";
  const alreadySubscribed = flash && flash.msg === "already";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${team.name} — Fixtures</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;0,800;0,900;1,900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg:        #0c111d;
      --surface:   #141b2d;
      --border:    rgba(255,255,255,0.09);
      --text:      #f4f6fb;
      --text-2:    #c4cad8;
      --text-3:    #8a93a8;
      --text-4:    #6b7488;
      --month-hdr: #8a93a8;
      --empty:     #565e72;
      --shadow:    0 6px 24px rgba(0,0,0,0.4);
      --tab-bg:    #1b2240;
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
    body { background: var(--bg); color: var(--text); font-family: 'Inter', Arial, sans-serif; min-height: 100vh; line-height: 1.5; }
    button, input { font-family: inherit; }

    /* Hero — clean solid band, no photo */
    .hero {
      position: relative; overflow: hidden;
      background: linear-gradient(160deg, #131a30, #0d1322);
      padding: 28px 20px 24px; border-bottom: 3px solid #cc0000; text-align: center;
    }
    /* Ghosted club crest watermark behind the hero content */
    .hero-watermark {
      position: absolute; inset: 0; margin: auto;
      width: 360px; height: 360px; object-fit: contain;
      opacity: 0.07; pointer-events: none; z-index: 0;
    }
    .hero-logo, .hero h1, .hero p, .hero-actions { position: relative; z-index: 1; }
    .hero-logo {
      width: 56px; height: 56px; object-fit: contain;
      background: rgba(255,255,255,0.92); border-radius: 12px; padding: 5px;
      margin-bottom: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.3);
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

    /* Social links — icon-only circles */
    .social-links { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 14px; }
    .social-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.06);
      text-decoration: none; transition: all 0.15s;
    }
    .social-btn:hover { transform: translateY(-2px); background: rgba(255,255,255,0.12); }
    .social-facebook { color: #4d9aff; }
    .social-instagram { color: #e1306c; }
    .social-tiktok { color: #69c9d0; }

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
    .date-tab-row { display: flex; justify-content: space-between; align-items: flex-end; }
    .date-tab {
      display: inline-block; background: var(--tab-bg); color: #fff;
      font-size: 0.68rem; font-weight: 900; letter-spacing: 1.5px;
      text-transform: uppercase; padding: 8px 18px;
      border-radius: 8px 8px 0 0;
    }
    body.light .date-tab { color: #fff; }
    .date-flags { display: flex; gap: 6px; align-items: flex-end; }
    .next-tab {
      display: inline-block; background: #cc0000; color: #fff;
      font-size: 0.68rem; font-weight: 900; letter-spacing: 1.5px;
      text-transform: uppercase; padding: 8px 18px;
      border-radius: 8px 8px 0 0; font-style: italic;
    }
    .cancelled-tab {
      display: inline-block; background: #b45309; color: #fff;
      font-size: 0.68rem; font-weight: 900; letter-spacing: 1.5px;
      text-transform: uppercase; padding: 8px 18px;
      border-radius: 8px 8px 0 0; font-style: italic;
    }
    .date-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 0 10px 10px 10px; box-shadow: var(--shadow);
      overflow: hidden;
    }
    .date-card.has-next { border-radius: 0 0 10px 10px; }
    /* Cancelled-but-shown fixtures: warm amber highlight so they stand out */
    .date-card.has-cancelled { border-color: #b45309; }
    body.light .date-card.has-cancelled { background: #fffbf5; }

    /* Fixture row: home | centre | away */
    .fx {
      display: grid; grid-template-columns: 1fr auto 1fr;
      align-items: center; gap: 16px;
      padding: 18px 24px; border-bottom: 1px solid var(--border);
    }
    .fx:last-child { border-bottom: none; }
    .fx-next { box-shadow: inset 4px 0 0 #cc0000; }
    .fx-cancelled { opacity: 0.7; box-shadow: inset 4px 0 0 #b45309; }

    .fx-team {
      font-size: 1rem; font-weight: 900; text-transform: uppercase;
      letter-spacing: 1px; line-height: 1.25;
    }
    .fx-team-home { text-align: right; }
    .fx-team-away { text-align: left; }

    .fx-centre { text-align: center; min-width: 190px; }
    .fx-pills { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-bottom: 6px; }
    /* Outline pills — no fill, just a coloured border + matching text */
    .pill {
      display: inline-block; padding: 2px 9px; font-size: 0.58rem;
      font-weight: 900; letter-spacing: 1px; text-transform: uppercase;
      border-radius: 10px; background: transparent;
      border: 1px solid currentColor; color: var(--text-3);
    }
    .pill-home { color: #cc0000; }
    .pill-away { color: var(--text-3); }
    .pill-squad { color: #60a5fa; }
    body.light .pill-squad { color: #1e40af; }
    .squad-bar { margin-top: 8px; }
    .pill-w { color: #4ade80; }
    .pill-d { color: #f0b429; }
    .pill-l { color: #f87171; }
    body.light .pill-w { color: #166534; }
    body.light .pill-d { color: #92400e; }
    body.light .pill-l { color: #b91c1c; }

    /* Played match score */
    .fx-ft { font-size: 0.62rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-4); margin-bottom: 2px; }
    .fx-score { font-size: 1.7rem; font-weight: 900; letter-spacing: 1px; line-height: 1.1; }
    .fx-score-sep { color: #cc0000; padding: 0 6px; }
    .fx-scorers { font-size: 0.74rem; color: var(--text-3); margin-top: 5px; }
    .fx-report { margin-top: 8px; max-width: 420px; margin-left: auto; margin-right: auto; }
    .fx-report summary {
      font-size: 0.68rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
      color: #cc0000; cursor: pointer; list-style: none;
    }
    .fx-report summary::after { content: " ▾"; }
    .fx-report[open] summary::after { content: " ▴"; }
    .fx-report p { font-size: 0.8rem; color: var(--text-2); line-height: 1.6; margin-top: 8px; text-align: left; }

    /* Stats panel */
    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px; margin-top: 18px;
    }
    .stat-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
      box-shadow: var(--shadow); padding: 20px 22px;
    }
    .stat-card-title {
      font-size: 0.68rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;
      color: #cc0000; font-style: italic; margin-bottom: 16px; text-align: center;
    }
    .big-record { display: flex; justify-content: space-around; gap: 8px; }
    .big-stat { text-align: center; }
    .big-stat strong { display: block; font-size: 1.7rem; font-weight: 900; letter-spacing: -0.5px; }
    .big-stat span { font-size: 0.62rem; color: var(--text-4); text-transform: uppercase; letter-spacing: 1px; }
    .c-w, .big-stat.c-w strong { color: #1a7a2e; font-style: normal; }
    .c-d, .big-stat.c-d strong { color: #b8860b; font-style: normal; }
    .c-l, .big-stat.c-l strong { color: #aa2222; font-style: normal; }
    .stat-row { margin-bottom: 14px; }
    .stat-row:last-child { margin-bottom: 0; }
    .stat-row-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
    .stat-row-label { font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-2); }
    .stat-row-detail { font-size: 0.74rem; color: var(--text-3); font-weight: 700; }
    .bar { display: flex; height: 10px; border-radius: 6px; overflow: hidden; gap: 1px; }
    .bar span { display: block; }
    .tab-stats { font-weight: 800; }
    .sr-form { display: flex; gap: 5px; align-items: center; }
    .sr-form-label { font-size: 0.68rem; color: var(--text-4); text-transform: uppercase; letter-spacing: 1px; margin-right: 4px; }
    .form-dot {
      width: 22px; height: 22px; border-radius: 50%; display: inline-flex;
      align-items: center; justify-content: center;
      font-size: 0.62rem; font-weight: 900; color: #fff;
    }
    .form-w { background: #1a7a2e; }
    .form-d { background: #b8860b; }
    .form-l { background: #aa2222; }
    .pill-next { color: #cc0000; }
    .pill-cancelled { color: #b45309; }
    .fx-time { font-size: 1.5rem; font-weight: 900; letter-spacing: 1px; }
    .fx-venue { font-size: 0.75rem; color: var(--text-3); margin-top: 3px; }
    .fx-comp { font-size: 0.68rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 1px; margin-top: 3px; }

    /* Non-fixture events: single centred block */
    .fx-event { grid-template-columns: 1fr; }
    .fx-event-title {
      font-size: 1rem; font-weight: 900; text-transform: uppercase;
      letter-spacing: 1px; margin-bottom: 2px;
    }

    /* RSVP strip */
    .fx-rsvp {
      grid-column: 1 / -1; display: flex; gap: 8px; align-items: center;
      justify-content: center; flex-wrap: wrap;
      margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border);
    }
    .fx-rsvp-family { flex-direction: column; gap: 6px; }
    .rsvp-person { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center; }
    .fx-rsvp-family .rsvp-label { min-width: 90px; text-align: right; }
    .rsvp-label { font-size: 0.66rem; color: var(--text-4); text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
    .rsvp-btn {
      background: transparent; border: 1px solid var(--border); color: var(--text-3);
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.5px;
      padding: 5px 12px; border-radius: 14px; cursor: pointer; transition: all 0.15s;
    }
    .rsvp-btn:hover { color: var(--text); border-color: var(--text-4); }
    .rsvp-going.rsvp-on { background: #1a7a2e; border-color: #1a7a2e; color: #fff; }
    .rsvp-maybe.rsvp-on { background: #b8860b; border-color: #b8860b; color: #fff; }
    .rsvp-no.rsvp-on    { background: #aa2222; border-color: #aa2222; color: #fff; }
    .rsvp-count { font-size: 0.68rem; color: var(--text-3); font-weight: 700; margin-left: 4px; }

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

    /* Calendar chooser */
    .cal-option {
      display: flex; align-items: center; gap: 14px; width: 100%;
      background: var(--bg); border: 1px solid var(--border); border-radius: 12px;
      padding: 14px 18px; margin-bottom: 10px; text-decoration: none;
      color: var(--text); transition: border-color 0.15s; cursor: pointer;
      font-family: inherit; font-size: inherit; text-align: left;
    }
    .cal-option:hover { border-color: #cc0000; }
    .cal-option-icon { font-size: 1.3rem; flex-shrink: 0; }
    .cal-option-name { font-weight: 700; font-size: 0.9rem; }
    .cal-option-sub { font-size: 0.74rem; color: var(--text-3); margin-top: 1px; }
    .cal-copy-row {
      display: flex; gap: 8px; margin-top: 14px; padding-top: 14px;
      border-top: 1px dashed var(--border);
    }
    .cal-copy-row input {
      flex: 1; background: var(--bg); border: 1px solid var(--border);
      color: var(--text-3); font-size: 0.72rem; padding: 9px 12px;
      border-radius: 8px; outline: none; font-family: inherit;
    }
    .cal-copy-btn {
      background: var(--border); border: none; color: var(--text-2);
      font-size: 0.72rem; font-weight: 700; padding: 9px 16px;
      border-radius: 8px; cursor: pointer; font-family: inherit; white-space: nowrap;
    }
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
    ${team.logo_mime ? `
    <img src="/logo/${team.slug}?v=${new Date(team.logo_updated_at || Date.now()).getTime()}" alt="" aria-hidden="true" class="hero-watermark">` : ""}
    ${team.logo_mime ? `
    <img src="/logo/${team.slug}?v=${new Date(team.logo_updated_at || Date.now()).getTime()}" alt="${team.name} logo" class="hero-logo">` : ""}
    <h1>${team.name} <span>Fixtures</span></h1>
    <p>Upcoming and past fixtures for ${team.name}.</p>
    <div class="hero-actions">
      ${isPaid ? (() => {
        if (isSubscribed || justSubscribed) {
          return `<button onclick="openCalModal()" class="btn btn-primary">📅 Add to Calendar</button>
                  <a href="/my-teams" class="btn btn-outline">Manage Subscriptions</a>`;
        } else if (fanUser) {
          return `<form method="POST" action="/${team.slug}/subscribe" style="display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center">
                    ${squads.length ? `
                    <select name="squadId" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-size:0.8rem;font-family:inherit">
                      <option value="">Whole club</option>
                      ${squads.map(s => `<option value="${s.id}">${s.name} only</option>`).join("")}
                    </select>` : ""}
                    <button type="submit" class="btn btn-primary">📅 Subscribe for Updates</button>
                  </form>`;
        } else {
          return `<button onclick="document.getElementById('subscribe-modal').classList.add('open')" class="btn btn-primary">📅 Subscribe for Updates</button>`;
        }
      })() : ""}
    </div>
    ${(team.facebook_url || team.instagram_url || team.tiktok_url) ? `
    <div class="social-links">
      ${team.facebook_url ? `<a href="${team.facebook_url}" target="_blank" rel="noopener" class="social-btn social-facebook" title="Facebook" aria-label="Facebook">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
      </a>` : ""}
      ${team.instagram_url ? `<a href="${team.instagram_url}" target="_blank" rel="noopener" class="social-btn social-instagram" title="Instagram" aria-label="Instagram">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
      </a>` : ""}
      ${team.tiktok_url ? `<a href="${team.tiktok_url}" target="_blank" rel="noopener" class="social-btn social-tiktok" title="TikTok" aria-label="TikTok">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/></svg>
      </a>` : ""}
    </div>` : ""}
  </div>

  ${justSubscribed ? `
  <div class="subscribe-success">
    <div class="subscribe-success-inner">
      <div class="tick">✅</div>
      <h3>You're subscribed!</h3>
      <p>You'll be emailed whenever ${team.name} reschedule or cancel a fixture.<br>Now add the live fixture calendar to your phone:</p>
      <button onclick="openCalModal()" class="btn btn-primary" style="display:inline-flex">📅 Add to Calendar</button>
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
    ${buildTabs(upcoming, getPlayedMatches(visible).length > 0)}
    <div id="fixtures-view">
      ${buildSquadTabs(upcoming, squads)}
      ${past.length > 0 ? `
      <button class="past-toggle" onclick="togglePast(this)">
        <span id="past-arrow">▶</span> Past Fixtures (${past.length})
      </button>
      <div id="past-fixtures">
        ${fixtureCards(past, -1, theme, ctx)}
      </div>` : ""}
      <div id="upcoming-rows">
        ${fixtureCards(upcoming, nextIndex, theme, ctx)}
      </div>
    </div>
    ${buildStatsPanel(visible)}
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

  <!-- Calendar chooser modal -->
  ${isPaid ? `
  <div id="cal-modal" class="modal-overlay">
    <div class="modal">
      <h2>Add to Your Calendar</h2>
      <p>Pick your calendar app — fixtures and training stay up to date automatically, including reschedules and cancellations.</p>
      <a href="${webcalUrl}" class="cal-option">
        <span class="cal-option-icon">🍎</span>
        <span>
          <span class="cal-option-name">Apple Calendar</span>
          <span class="cal-option-sub" style="display:block">iPhone, iPad & Mac — opens instantly</span>
        </span>
      </a>
      <a href="${googleCalUrl}" target="_blank" rel="noopener" class="cal-option">
        <span class="cal-option-icon">📆</span>
        <span>
          <span class="cal-option-name">Google Calendar</span>
          <span class="cal-option-sub" style="display:block">Opens Google Calendar to confirm the subscription</span>
        </span>
      </a>
      <a href="${outlookCalUrl}" target="_blank" rel="noopener" class="cal-option">
        <span class="cal-option-icon">📧</span>
        <span>
          <span class="cal-option-name">Outlook</span>
          <span class="cal-option-sub" style="display:block">Outlook.com & Microsoft 365</span>
        </span>
      </a>
      <div class="cal-copy-row">
        <input type="text" id="cal-url" value="${calendarUrl}" readonly onclick="this.select()">
        <button type="button" class="cal-copy-btn" onclick="copyCalUrl(this)">Copy link</button>
      </div>
      <button type="button" onclick="document.getElementById('cal-modal').classList.remove('open')"
        style="background:none;border:none;color:var(--text-4);font-size:0.75rem;cursor:pointer;margin-top:16px;display:block;width:100%;text-align:center;font-family:inherit">
        Close
      </button>
    </div>
  </div>` : ""}

  <script>
    function openCalModal() {
      document.getElementById('cal-modal').classList.add('open');
    }
    function copyCalUrl(btn) {
      const input = document.getElementById('cal-url');
      input.select();
      navigator.clipboard.writeText(input.value).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy link'; }, 2000);
      });
    }
    const calModal = document.getElementById('cal-modal');
    if (calModal) calModal.addEventListener('click', e => { if (e.target === calModal) calModal.classList.remove('open'); });

    function togglePast(btn) {
      const el = document.getElementById('past-fixtures');
      const arrow = document.getElementById('past-arrow');
      const open = el.style.display === 'block';
      el.style.display = open ? 'none' : 'block';
      arrow.textContent = open ? '▶' : '▼';
    }

    // Tab groups map to underlying row types; 'stats' swaps the whole view.
    // 'all' is every game type but no events — events live only under Events.
    const TAB_GROUPS = {
      all:    ['league', 'cup', 'tournament', 'festival'],
      league: ['league'],
      other:  ['cup', 'tournament', 'festival'],
      events: ['training', 'meeting', 'social', 'duty'],
    };
    let activeGroup = 'all';
    let activeSquad = 'all';

    function filterScope(scope, types) {
      if (!scope) return;
      scope.querySelectorAll('.fx').forEach(row => {
        const typeOk  = !types || types.includes(row.dataset.type);
        const squadOk = activeSquad === 'all' || row.dataset.squad === activeSquad || row.dataset.squad === '0';
        row.style.display = (typeOk && squadOk) ? '' : 'none';
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

    function applyFilters() {
      // Only type-filter when a tab bar exists, so single-category pages
      // (e.g. events-only) keep showing every row.
      const hasTabs = !!document.getElementById('tab-bar');
      const types = hasTabs ? (TAB_GROUPS[activeGroup] || null) : null;
      filterScope(document.getElementById('upcoming-rows'), types);
      filterScope(document.getElementById('past-fixtures'), types);

      // Hide the Past toggle entirely when nothing past matches the filter
      const pastWrap = document.getElementById('past-fixtures');
      const pastToggle = document.querySelector('.past-toggle');
      if (pastToggle && pastWrap) {
        const anyPast = [...pastWrap.querySelectorAll('.fx')].some(r => r.style.display !== 'none');
        pastToggle.style.display = anyPast ? '' : 'none';
      }
    }

    function filterTab(group) {
      document.querySelectorAll('#tab-bar .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === group);
      });

      const fixturesView = document.getElementById('fixtures-view');
      const statsPanel = document.getElementById('stats-panel');
      if (group === 'stats') {
        fixturesView.style.display = 'none';
        if (statsPanel) statsPanel.style.display = 'block';
        return;
      }
      fixturesView.style.display = '';
      if (statsPanel) statsPanel.style.display = 'none';
      activeGroup = group;
      applyFilters();
    }

    function filterSquad(squad) {
      activeSquad = String(squad);
      document.querySelectorAll('#squad-bar .squad-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.squad === activeSquad);
      });
      applyFilters();
    }

    // Apply the default 'All' filter on load so events start hidden when tabs exist
    if (document.getElementById('tab-bar')) applyFilters();

    // Close modal on backdrop click
    const modal = document.getElementById('subscribe-modal');
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  </script>

</body>
</html>`;
}

module.exports = { teamPage };
