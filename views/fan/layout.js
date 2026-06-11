function fanLayout(title, content, fanUser) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — FixtureApp</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;0,800;0,900;1,900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #eef0f4; --surface: #ffffff; --surface-2: #f4f5f8;
      --border: #e5e7eb; --border-2: #d1d5db;
      --text: #111827; --text-2: #4b5563; --text-3: #6b7280; --text-4: #9ca3af;
      --red: #e02828; --red-dark: #b91c1c;
      --navy: #0d1322; --navy-text: #aeb6c8;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(ellipse 70% 30% at 50% -10%, rgba(224,40,40,0.07), transparent), var(--bg);
      color: var(--text); font-family: 'Inter', Arial, sans-serif; min-height: 100vh; line-height: 1.5;
    }

    nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 28px; border-bottom: 1px solid rgba(255,255,255,0.08);
      position: sticky; top: 0; z-index: 50; background: rgba(13,19,34,0.95); backdrop-filter: blur(10px);
    }
    .nav-logo { font-size: 1rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #fff; text-decoration: none; font-style: italic; }
    .nav-logo span { color: var(--red); }
    .nav-links { display: flex; align-items: center; gap: 22px; }
    .nav-links a { color: var(--navy-text); text-decoration: none; font-size: 0.84rem; font-weight: 600; }
    .nav-links a:hover { color: #fff; }

    .container { max-width: 700px; margin: 40px auto; padding: 0 20px; }

    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 1.6rem; font-weight: 900; letter-spacing: -0.5px; }
    .page-header p { color: var(--text-3); font-size: 0.88rem; margin-top: 6px; }

    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 28px; margin-bottom: 20px; box-shadow: 0 8px 30px rgba(16,24,40,0.08); }
    .card-title { font-size: 0.76rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--red); margin-bottom: 18px; }

    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 11px 22px; font-size: 0.86rem; font-weight: 700;
      text-decoration: none; border: none; cursor: pointer; border-radius: 10px;
      font-family: inherit; transition: all 0.15s;
    }
    .btn-primary { background: var(--red); color: #fff; box-shadow: 0 6px 18px rgba(224,40,40,0.25); }
    .btn-primary:hover { background: var(--red-dark); }
    .btn-secondary { background: var(--surface-2); color: var(--text-2); border: 1px solid var(--border-2); }
    .btn-secondary:hover { color: var(--text); }
    .btn-sm { padding: 7px 14px; font-size: 0.76rem; }

    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 0.74rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-3); margin-bottom: 6px; }
    .form-group input {
      width: 100%; background: var(--bg); border: 1px solid var(--border-2); color: var(--text);
      padding: 11px 14px; font-size: 0.9rem; outline: none; border-radius: 10px; font-family: inherit;
    }
    .form-group input:focus { border-color: var(--red); }

    .alert { padding: 12px 16px; margin-bottom: 20px; font-size: 0.85rem; border-radius: 10px; border: 1px solid; }
    .alert-success { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .alert-error   { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
    .alert-info    { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }

    footer { text-align: center; padding: 40px 20px; color: var(--text-4); font-size: 0.75rem; }
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
