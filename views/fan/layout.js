function fanLayout(title, content, fanUser) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — FixtureApp</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #1a1a1a; color: #fff; font-family: Arial, sans-serif; min-height: 100vh; }

    nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 28px; background: #111; border-bottom: 1px solid #2a2a2a;
      position: sticky; top: 0; z-index: 50;
    }
    .nav-logo { font-size: 1rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #fff; text-decoration: none; }
    .nav-logo span { color: #cc0000; }
    .nav-links { display: flex; align-items: center; gap: 20px; }
    .nav-links a { color: #aaa; text-decoration: none; font-size: 0.82rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .nav-links a:hover { color: #fff; }

    .container { max-width: 700px; margin: 40px auto; padding: 0 20px; }

    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 1.4rem; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
    .page-header p { color: #666; font-size: 0.85rem; margin-top: 6px; }

    .card { background: #222; padding: 28px; margin-bottom: 20px; }
    .card-title { font-size: 0.78rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #cc0000; margin-bottom: 18px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 11px 22px; font-size: 0.82rem; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase; text-decoration: none;
      border: none; cursor: pointer;
    }
    .btn-primary { background: #cc0000; color: #fff; }
    .btn-primary:hover { background: #aa0000; }
    .btn-secondary { background: #2a2a2a; color: #ccc; border: 1px solid #333; }
    .btn-secondary:hover { background: #333; }
    .btn-sm { padding: 7px 14px; font-size: 0.75rem; }

    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 0.75rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #888; margin-bottom: 6px; }
    .form-group input { width: 100%; background: #111; border: 1px solid #333; color: #fff; padding: 10px 14px; font-size: 0.9rem; outline: none; }
    .form-group input:focus { border-color: #cc0000; }

    .alert { padding: 12px 16px; margin-bottom: 20px; font-size: 0.85rem; border-left: 3px solid; }
    .alert-success { background: #1a2a1a; border-color: #4a4; color: #8d8; }
    .alert-error   { background: #2a1a1a; border-color: #a44; color: #d88; }
    .alert-info    { background: #1a1f2a; border-color: #448; color: #88d; }

    footer { text-align: center; padding: 40px 20px; color: #444; font-size: 0.75rem; }
  </style>
</head>
<body>
  <nav>
    <a href="/" class="nav-logo">Fixture<span>App</span></a>
    <div class="nav-links">
      ${fanUser
        ? `<a href="/my-teams">My Teams</a><a href="/fan/logout">Log Out</a>`
        : `<a href="/fan/login">Log In</a><a href="/fan/signup">Sign Up Free</a>`
      }
    </div>
  </nav>
  <div class="container">
    ${content}
  </div>
  <footer>© ${new Date().getFullYear()} FixtureApp</footer>
</body>
</html>`;
}

module.exports = { fanLayout };
