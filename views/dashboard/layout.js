function layout(title, content, user) {
  const isLight = user && user.team_theme === "light";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Fixture App</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;0,800;0,900;1,900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg:         #0c111d;
      --surface:    #141b2d;
      --sidebar-bg: #0f1524;
      --border:     rgba(255,255,255,0.08);
      --border2:    rgba(255,255,255,0.16);
      --text:       #f4f6fb;
      --text-2:     #c4cad8;
      --text-3:     #8a93a8;
      --text-4:     #6b7488;
      --text-5:     #565e72;
      --input-bg:   #0c111d;
      --row-hover:  #1a2235;
      --th-color:   #6b7488;
      --td-color:   #c4cad8;
      --red:        #e02828;
      --red-dark:   #b91c1c;
      --radius:     12px;
    }
    body.light {
      --bg:         #f0f2f5;
      --surface:    #ffffff;
      --sidebar-bg: #f4f5f8;
      --border:     #e2e5ea;
      --border2:    #d1d5db;
      --text:       #111827;
      --text-2:     #374151;
      --text-3:     #6b7280;
      --text-4:     #9ca3af;
      --text-5:     #9ca3af;
      --input-bg:   #f8f9fb;
      --row-hover:  #f9fafb;
      --th-color:   #6b7280;
      --td-color:   #374151;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: 'Inter', Arial, sans-serif; min-height: 100vh; display: flex; flex-direction: column; }

    /* Top nav */
    .topnav {
      background: var(--surface);
      border-bottom: 2px solid var(--red);
      padding: 0 30px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .topnav-brand { font-size: 1rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: var(--text); text-decoration: none; font-style: italic; }
    .topnav-brand span { color: var(--red); }
    .topnav-right { display: flex; align-items: center; gap: 20px; }
    .topnav-right a { color: var(--text-3); text-decoration: none; font-size: 0.8rem; letter-spacing: 1px; text-transform: uppercase; }
    .topnav-right a:hover { color: var(--text); }

    /* Layout */
    .shell { display: flex; flex: 1; }

    /* Sidebar */
    .sidebar { width: 220px; background: var(--sidebar-bg); border-right: 1px solid var(--border); padding: 24px 0; flex-shrink: 0; }
    .sidebar-section { padding: 8px 20px 4px; font-size: 0.65rem; color: var(--text-5); letter-spacing: 2px; text-transform: uppercase; }
    .sidebar a { display: flex; align-items: center; gap: 10px; padding: 10px 20px; color: var(--text-3); text-decoration: none; font-size: 0.85rem; border-left: 3px solid transparent; }
    .sidebar a:hover { color: var(--text); background: var(--surface); }
    .sidebar a.active { color: var(--text); border-left-color: var(--red); background: var(--surface); }

    /* Main content */
    .main { flex: 1; padding: 30px; overflow-y: auto; }

    /* Page header */
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 1.4rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
    .page-header p { color: var(--text-4); font-size: 0.85rem; margin-top: 4px; }

    /* Cards */
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px; margin-bottom: 16px; }
    .card-title { font-size: 0.75rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--red); margin-bottom: 16px; }

    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { text-align: left; padding: 10px 12px; font-size: 0.7rem; letter-spacing: 1px; text-transform: uppercase; color: var(--th-color); border-bottom: 1px solid var(--border); }
    td { padding: 12px; border-bottom: 1px solid var(--border); color: var(--td-color); vertical-align: middle; }
    tr:hover td { background: var(--row-hover); }

    /* Forms */
    .form-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 160px; }
    label { font-size: 0.72rem; letter-spacing: 1px; text-transform: uppercase; color: var(--text-4); }
    input, select, textarea { background: var(--input-bg); border: 1px solid var(--border2); color: var(--text); padding: 9px 12px; font-size: 0.85rem; width: 100%; outline: none; border-radius: 8px; font-family: inherit; }
    input:focus, select:focus, textarea:focus { border-color: var(--red); }
    select option { background: var(--input-bg); color: var(--text); }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; font-size: 0.8rem; font-weight: 700; border: none; cursor: pointer; text-decoration: none; border-radius: 8px; font-family: inherit; transition: all 0.15s; }
    .btn-primary { background: var(--red); color: #fff; }
    .btn-primary:hover { background: var(--red-dark); }
    .btn-secondary { background: var(--row-hover); color: var(--text); border: 1px solid var(--border2); }
    .btn-secondary:hover { opacity: 0.85; }
    .btn-sm { padding: 6px 12px; font-size: 0.72rem; }

    /* Badges */
    .badge { display: inline-block; padding: 3px 9px; font-size: 0.64rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-radius: 10px; }
    .badge-free     { background: var(--row-hover); color: var(--text-3); }
    .badge-standard { background: #143620; color: #4ade80; }
    .badge-pro      { background: #14203a; color: #60a5fa; }

    /* Alert */
    .alert { padding: 12px 16px; font-size: 0.85rem; margin-bottom: 16px; border-radius: 10px; }
    .alert-error   { background: rgba(224,40,40,0.1); border: 1px solid rgba(224,40,40,0.35); color: #fca5a5; }
    .alert-success { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: #86efac; }
    body.light .alert-error   { background: #fff0f0; border-color: #fca5a5; color: #aa0000; }
    body.light .alert-success { background: #f0fff4; border-color: #86efac; color: #1a6a1a; }

    /* Stats row */
    .stats { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 20px; flex: 1; min-width: 120px; }
    .stat-value { font-size: 1.8rem; font-weight: 900; color: var(--text); letter-spacing: -0.5px; }
    .stat-label { font-size: 0.7rem; color: var(--text-5); letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }

    /* Theme option cards */
    .theme-options { display: flex; gap: 12px; flex-wrap: wrap; }
    .theme-opt { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border: 2px solid var(--border); border-radius: 12px; cursor: pointer; flex: 1; min-width: 150px; transition: border-color 0.15s; }
    .theme-opt:hover { border-color: var(--red); }
    .theme-opt.selected { border-color: var(--red); }
    .theme-swatch { width: 36px; height: 36px; border: 1px solid var(--border2); border-radius: 8px; flex-shrink: 0; }
    .theme-label { font-size: 0.82rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .theme-sub { font-size: 0.7rem; color: var(--text-4); margin-top: 2px; }

    /* Mobile: sidebar becomes a horizontal tab bar, tables scroll inside cards */
    @media (max-width: 760px) {
      .topnav { padding: 0 16px; height: 50px; }
      .topnav-right span { display: none; }
      .shell { flex-direction: column; }
      .sidebar {
        width: 100%; display: flex; align-items: center; overflow-x: auto;
        padding: 0; border-right: none; border-bottom: 1px solid var(--border);
        -webkit-overflow-scrolling: touch;
      }
      .sidebar-section { display: none; }
      .sidebar a {
        border-left: none; border-bottom: 3px solid transparent;
        white-space: nowrap; padding: 12px 14px; flex-shrink: 0; font-size: 0.8rem;
      }
      .sidebar a.active { border-bottom-color: var(--red); background: none; }
      .main { padding: 16px 14px; }
      .card { padding: 16px; overflow-x: auto; }
      table { min-width: 640px; }
      .stats { gap: 10px; }
      .stat { min-width: calc(50% - 5px); padding: 12px 14px; }
      .stat-value { font-size: 1.4rem; }
      .page-header h1 { font-size: 1.15rem; }
      .form-row { gap: 10px; }
      .form-group { min-width: 100%; }
      td, th { padding: 9px 8px; }
    }
  </style>
</head>
<body${isLight ? ' class="light"' : ''}>
  <nav class="topnav">
    <a href="/dashboard" class="topnav-brand">Fixture<span>App</span></a>
    <div class="topnav-right">
      ${user ? `<span style="color:var(--text-4);font-size:0.8rem">${user.email}</span>` : ""}
      ${user ? `<a href="/dashboard/logout">Logout</a>` : ""}
    </div>
  </nav>
  <div class="shell">
    ${user ? (() => {
      const canComms  = ["owner", "manager", "master"].includes(user.role);
      const isOwner   = ["owner", "master"].includes(user.role);
      return `
    <nav class="sidebar">
      <div class="sidebar-section">Club</div>
      <a href="/dashboard">📋 Fixtures</a>
      ${canComms ? `<a href="/dashboard/subscribers">👥 Subscribers</a>` : ""}
      ${canComms ? `<a href="/dashboard/messages">📣 Messages</a>` : ""}
      <a href="/dashboard/feed">📅 Calendar Feed</a>
      ${isOwner ? `<a href="/dashboard/members">🤝 Members</a>` : ""}
      <a href="/dashboard/settings">⚙️ Settings</a>
      ${user.role === "master" ? `
      <div class="sidebar-section" style="margin-top:16px">Master</div>
      <a href="/dashboard/master">🏢 All Teams</a>
      ` : ""}
    </nav>`;
    })() : ""}
    <main class="main">
      ${content}
    </main>
  </div>
</body>
</html>`;
}

module.exports = { layout };
