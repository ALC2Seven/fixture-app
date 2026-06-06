function layout(title, content, user) {
  const isLight = user && user.team_theme === "light";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Fixture App</title>
  <style>
    :root {
      --bg:         #111111;
      --surface:    #1a1a1a;
      --sidebar-bg: #161616;
      --border:     #222222;
      --border2:    #333333;
      --text:       #ffffff;
      --text-2:     #cccccc;
      --text-3:     #888888;
      --text-4:     #666666;
      --text-5:     #555555;
      --input-bg:   #111111;
      --row-hover:  #1f1f1f;
      --th-color:   #555555;
      --td-color:   #cccccc;
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
    body { background: var(--bg); color: var(--text); font-family: Arial, sans-serif; min-height: 100vh; display: flex; flex-direction: column; }

    /* Top nav */
    .topnav {
      background: var(--surface);
      border-bottom: 2px solid #cc0000;
      padding: 0 30px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .topnav-brand { font-size: 1rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: var(--text); text-decoration: none; }
    .topnav-brand span { color: #cc0000; }
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
    .sidebar a.active { color: var(--text); border-left-color: #cc0000; background: var(--surface); }

    /* Main content */
    .main { flex: 1; padding: 30px; overflow-y: auto; }

    /* Page header */
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 1.4rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
    .page-header p { color: var(--text-4); font-size: 0.85rem; margin-top: 4px; }

    /* Cards */
    .card { background: var(--surface); border: 1px solid var(--border); padding: 20px; margin-bottom: 16px; }
    .card-title { font-size: 0.75rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #cc0000; margin-bottom: 16px; }

    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { text-align: left; padding: 10px 12px; font-size: 0.7rem; letter-spacing: 1px; text-transform: uppercase; color: var(--th-color); border-bottom: 1px solid var(--border); }
    td { padding: 12px; border-bottom: 1px solid var(--border); color: var(--td-color); vertical-align: middle; }
    tr:hover td { background: var(--row-hover); }

    /* Forms */
    .form-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 160px; }
    label { font-size: 0.72rem; letter-spacing: 1px; text-transform: uppercase; color: var(--text-4); }
    input, select, textarea { background: var(--input-bg); border: 1px solid var(--border2); color: var(--text); padding: 9px 12px; font-size: 0.85rem; width: 100%; outline: none; }
    input:focus, select:focus, textarea:focus { border-color: #cc0000; }
    select option { background: var(--input-bg); color: var(--text); }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; font-size: 0.8rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border: none; cursor: pointer; text-decoration: none; }
    .btn-primary { background: #cc0000; color: #fff; }
    .btn-primary:hover { background: #aa0000; }
    .btn-secondary { background: var(--border2); color: var(--text); }
    .btn-secondary:hover { opacity: 0.8; }
    .btn-sm { padding: 6px 12px; font-size: 0.72rem; }

    /* Badges */
    .badge { display: inline-block; padding: 3px 8px; font-size: 0.65rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .badge-free     { background: var(--border2); color: var(--text-3); }
    .badge-standard { background: #1a3a1a; color: #4caf50; }
    .badge-pro      { background: #1a1a3a; color: #5c9aff; }

    /* Alert */
    .alert { padding: 12px 16px; font-size: 0.85rem; margin-bottom: 16px; }
    .alert-error   { background: #2a1010; border-left: 3px solid #cc0000; color: #ff8080; }
    .alert-success { background: #0f2a0f; border-left: 3px solid #4caf50; color: #80cc80; }
    body.light .alert-error   { background: #fff0f0; border-left: 3px solid #cc0000; color: #aa0000; }
    body.light .alert-success { background: #f0fff4; border-left: 3px solid #4caf50; color: #1a6a1a; }

    /* Stats row */
    .stats { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat { background: var(--surface); border: 1px solid var(--border); padding: 16px 20px; flex: 1; min-width: 120px; }
    .stat-value { font-size: 1.8rem; font-weight: 900; color: var(--text); }
    .stat-label { font-size: 0.7rem; color: var(--text-5); letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }

    /* Theme option cards */
    .theme-options { display: flex; gap: 12px; flex-wrap: wrap; }
    .theme-opt { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border: 2px solid var(--border); cursor: pointer; flex: 1; min-width: 150px; transition: border-color 0.15s; }
    .theme-opt:hover { border-color: #cc0000; }
    .theme-opt.selected { border-color: #cc0000; }
    .theme-swatch { width: 36px; height: 36px; border: 1px solid var(--border2); flex-shrink: 0; }
    .theme-label { font-size: 0.82rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .theme-sub { font-size: 0.7rem; color: var(--text-4); margin-top: 2px; }
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
    ${user ? `
    <nav class="sidebar">
      <div class="sidebar-section">Club</div>
      <a href="/dashboard">📋 Fixtures</a>
      <a href="/dashboard/subscribers">👥 Subscribers</a>
      <a href="/dashboard/feed">📅 Calendar Feed</a>
      <a href="/dashboard/settings">⚙️ Settings</a>
      ${user.role === "master" ? `
      <div class="sidebar-section" style="margin-top:16px">Master</div>
      <a href="/dashboard/master">🏢 All Teams</a>
      ` : ""}
    </nav>` : ""}
    <main class="main">
      ${content}
    </main>
  </div>
</body>
</html>`;
}

module.exports = { layout };
