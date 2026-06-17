function signupPage(error, prefill) {
  const v = prefill || {};
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Up — FixtureApp</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,800;0,900;1,900&display=swap" rel="stylesheet">
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
      background: radial-gradient(ellipse 70% 40% at 50% -10%, rgba(224,40,40,0.08), transparent), var(--bg);
      color: var(--text); font-family: 'Inter', Arial, sans-serif;
      min-height: 100vh; display: flex; flex-direction: column; line-height: 1.5;
    }

    nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 36px; background: var(--navy);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .nav-logo { font-size: 1.05rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #fff; text-decoration: none; font-style: italic; }
    .nav-logo span { color: var(--red); }
    .nav-links { display: flex; align-items: center; gap: 22px; }
    .nav-links a { color: var(--navy-text); text-decoration: none; font-size: 0.84rem; font-weight: 600; }
    .nav-links a:hover { color: #fff; }

    main {
      flex: 1; display: flex; align-items: flex-start; justify-content: center;
      padding: 56px 20px;
    }
    .signup-wrap { width: 100%; max-width: 480px; }

    .signup-header { text-align: center; margin-bottom: 32px; }
    .signup-header h1 { font-size: 1.9rem; font-weight: 900; letter-spacing: -0.8px; margin-bottom: 8px; }
    .signup-header p { color: var(--text-2); font-size: 0.92rem; }

    .card { background: var(--surface); padding: 36px; border: 1px solid var(--border); border-radius: 18px; box-shadow: 0 8px 30px rgba(16,24,40,0.08); }

    .error-box {
      background: #fef2f2; border: 1px solid #fecaca;
      color: #b91c1c; padding: 12px 16px; font-size: 0.85rem;
      margin-bottom: 20px; border-radius: 10px;
    }

    .form-group { margin-bottom: 18px; }
    label { display: block; font-size: 0.76rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-3); margin-bottom: 7px; }
    input[type="text"], input[type="email"], input[type="password"] {
      width: 100%; background: var(--bg); border: 1px solid var(--border-2); color: var(--text);
      padding: 12px 14px; font-size: 0.9rem; outline: none; border-radius: 10px;
      font-family: inherit; transition: border-color 0.15s;
    }
    input:focus { border-color: var(--red); }
    .input-hint { font-size: 0.75rem; color: var(--text-4); margin-top: 5px; }
    .slug-preview { font-size: 0.78rem; color: var(--text-3); margin-top: 6px; }
    .slug-preview span { color: var(--red); }

    .plan-note {
      background: var(--surface-2); border: 1px solid var(--border);
      padding: 14px 16px; margin-bottom: 24px; font-size: 0.82rem; color: var(--text-2);
      display: flex; gap: 10px; align-items: flex-start; border-radius: 12px;
    }
    .plan-note strong { color: var(--text); }

    .btn-submit {
      width: 100%; background: var(--red); color: #fff; border: none;
      padding: 14px; font-size: 0.92rem; font-weight: 700; font-family: inherit;
      cursor: pointer; margin-bottom: 16px; border-radius: 10px;
      box-shadow: 0 6px 20px rgba(224,40,40,0.3); transition: all 0.15s;
    }
    .btn-submit:hover { background: var(--red-dark); transform: translateY(-1px); }

    .login-link { text-align: center; font-size: 0.82rem; color: var(--text-4); }
    .login-link a { color: var(--red); text-decoration: none; font-weight: 600; }
    .login-link a:hover { text-decoration: underline; }

    footer { border-top: 1px solid var(--border); padding: 24px 20px; text-align: center; }
    footer p { color: var(--text-4); font-size: 0.75rem; }
    footer a { color: var(--text-3); text-decoration: none; margin: 0 10px; }
    footer a:hover { color: var(--text-2); }
  </style>
</head>
<body>

<nav>
  <a href="/" class="nav-logo">Fixture<span>App</span></a>
  <div class="nav-links">
    <a href="/pricing">Pricing</a>
    <a href="/dashboard/login">Log in</a>
  </div>
</nav>

<main>
  <div class="signup-wrap">

    <div class="signup-header">
      <h1>Create your club</h1>
      <p>Set up your free account and get your fixture page live in minutes.</p>
    </div>

    <div class="card">
      ${error ? `<div class="error-box">${error}</div>` : ""}

      <form method="POST" action="/signup" id="signup-form">

        <div class="form-group">
          <label>Club Name</label>
          <input type="text" name="clubName" id="clubName" required
            placeholder="e.g. City FC"
            value="${v.clubName || ""}"
            autocomplete="organization">
        </div>

        <div class="form-group">
          <label>Your Page URL</label>
          <input type="text" name="slug" id="slug" required
            placeholder="e.g. city-fc"
            value="${v.slug || ""}"
            pattern="[a-z0-9\\-]+"
            title="Lowercase letters, numbers and hyphens only">
          <div class="slug-preview" id="slug-preview">
            fixtureapp.com/<span id="slug-display">${v.slug || "your-club"}</span>
          </div>
          <div class="input-hint">Lowercase letters, numbers and hyphens only. This can't be changed later.</div>
        </div>

        <div class="form-group">
          <label>Home Ground / Venue <span style="color:#555;font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></label>
          <input type="text" name="homeVenue"
            placeholder="e.g. Riverside Stadium, Manchester"
            value="${v.homeVenue || ""}"
            autocomplete="off">
          <div class="input-hint">Used to auto-fill the venue when adding home fixtures. Can be updated later.</div>
        </div>

        <div class="form-group">
          <label>Your Email</label>
          <input type="email" name="email" required
            placeholder="you@example.com"
            value="${v.email || ""}"
            autocomplete="email">
        </div>

        <div class="form-group">
          <label>Password</label>
          <input type="password" name="password" required
            placeholder="At least 8 characters"
            autocomplete="new-password">
          <div class="input-hint">Minimum 8 characters.</div>
        </div>

        <div class="plan-note">
          <span>🚀</span>
          <div>Starting on the <strong>Free plan</strong> — your public fixtures page is live immediately.
          Upgrade to <strong>Standard</strong> (£4.99/month) for a live calendar feed and automatic email alerts,
          or <strong>Pro</strong> (£9.99/month) to manage multiple squads or age groups.</div>
        </div>

        <button type="submit" class="btn-submit">Create Free Account →</button>
      </form>

      <div class="login-link">Already have an account? <a href="/dashboard/login">Log in</a></div>
    </div>

  </div>
</main>

<footer>
  <p>
    <a href="/">Home</a>
    <a href="/pricing">Pricing</a>
    <a href="/dashboard/login">Login</a>
  </p>
</footer>

<script>
  const clubInput = document.getElementById('clubName');
  const slugInput = document.getElementById('slug');
  const slugDisplay = document.getElementById('slug-display');

  function toSlug(str) {
    return str.toLowerCase()
      .replace(/[^a-z0-9\\s-]/g, '')
      .trim()
      .replace(/[\\s]+/g, '-')
      .replace(/-+/g, '-');
  }

  let userEditedSlug = ${v.slug ? 'true' : 'false'};

  clubInput.addEventListener('input', function() {
    if (!userEditedSlug) {
      const s = toSlug(this.value);
      slugInput.value = s;
      slugDisplay.textContent = s || 'your-club';
    }
  });

  slugInput.addEventListener('input', function() {
    userEditedSlug = true;
    // Clean as they type
    const cleaned = toSlug(this.value);
    slugDisplay.textContent = cleaned || 'your-club';
  });

  slugInput.addEventListener('blur', function() {
    this.value = toSlug(this.value);
  });
</script>

</body>
</html>`;
}

module.exports = { signupPage };
