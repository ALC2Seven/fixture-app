function layout(title, content, user) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Fixture App</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #111; color: #fff; font-family: Arial, sans-serif; min-height: 100vh; display: flex; flex-direction: column; }

    /* Top nav */
    .topnav {
      background: #1a1a1a;
      border-bottom: 2px solid #cc0000;
      padding: 0 30px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .topnav-brand {
      font-size: 1rem;
      font-weight: 900;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #fff;
      text-decoration: none;
    }
    .topnav-brand span { color: #cc0000; }
    .topnav-right { display: flex; align-items: center; gap: 20px; }
    .topnav-right a { color: #aaa; text-decoration: none; font-size: 0.8rem; letter-spacing: 1px; text-transform: uppercase; }
    .topnav-right a:hover { color: #fff; }

    /* Layout */
    .shell { display: flex; flex: 1; }

    /* Sidebar */
    .sidebar {
      width: 220px;
      background: #161616;
      border-right: 1px solid #222;
      padding: 24px 0;
      flex-shrink: 0;
    }
    .sidebar-section { padding: 8px 20px 4px; font-size: 0.65rem; color: #555; letter-spacing: 2px; text-transform: uppercase; }
    .sidebar a {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      color: #888;
      text-decoration: none;
      font-size: 0.85rem;
      border-left: 3px solid transparent;
    }
    .sidebar a:hover { color: #fff; background: #1a1a1a; }
    .sidebar a.active { color: #fff; border-left-color: #cc0000; background: #1a1a1a; }

    /* Main content */
    .main { flex: 1; padding: 30px; overflow-y: auto; }

    /* Page header */
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 1.4rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
    .page-header p { color: #666; font-size: 0.85rem; margin-top: 4px; }

    /* Cards */
    .card { background: #1a1a1a; border: 1px solid #222; padding: 20px; margin-bottom: 16px; }
    .card-title { font-size: 0.75rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #cc0000; margin-bottom: 16px; }

    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { text-align: left; padding: 10px 12px; font-size: 0.7rem; letter-spacing: 1px; text-transform: uppercase; color: #555; border-bottom: 1px solid #222; }
    td { padding: 12px; border-bottom: 1px solid #1f1f1f; color: #ccc; vertical-align: middle; }
    tr:hover td { background: #1f1f1f; }

    /* Forms */
    .form-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 160px; }
    label { font-size: 0.72rem; letter-spacing: 1px; text-transform: uppercase; color: #666; }
    input, select, textarea {
      background: #111;
      border: 1px solid #333;
      color: #fff;
      padding: 9px 12px;
      font-size: 0.85rem;
      width: 100%;
      outline: none;
    }
    input:focus, select:focus, textarea:focus { border-color: #cc0000; }
    select option { background: #111; }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; font-size: 0.8rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border: none; cursor: pointer; text-decoration: none; }
    .btn-primary { background: #cc0000; color: #fff; }
    .btn-primary:hover { background: #aa0000; }
    .btn-secondary { background: #333; color: #fff; }
    .btn-secondary:hover { background: #444; }
    .btn-sm { padding: 6px 12px; font-size: 0.72rem; }

    /* Badges */
    .badge { display: inline-block; padding: 3px 8px; font-size: 0.65rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .badge-free { background: #333; color: #888; }
    .badge-standard { background: #1a3a1a; color: #4caf50; }
    .badge-pro { background: #1a1a3a; color: #5c9aff; }

    /* Alert */
    .alert { padding: 12px 16px; font-size: 0.85rem; margin-bottom: 16px; }
    .alert-error { background: #2a1010; border-left: 3px solid #cc0000; color: #ff8080; }
    .alert-success { background: #0f2a0f; border-left: 3px solid #4caf50; color: #80cc80; }

    /* Stats row */
    .stats { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat { background: #1a1a1a; border: 1px solid #222; padding: 16px 20px; flex: 1; min-width: 120px; }
    .stat-value { font-size: 1.8rem; font-weight: 900; color: #fff; }
    .stat-label { font-size: 0.7rem; color: #555; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }
  </style>
</head>
<body>
  <nav class="topnav">
    <a href="/dashboard" class="topnav-brand">Fixture<span>App</span></a>
    <div class="topnav-right">
      ${user ? `<span style="color:#666;font-size:0.8rem">${user.email}</span>` : ""}
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
