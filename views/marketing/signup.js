function signupPage(error, prefill) {
  const v = prefill || {};
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Up — FixtureApp</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #1a1a1a; color: #fff; font-family: Arial, sans-serif; min-height: 100vh; display: flex; flex-direction: column; }

    nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 40px; border-bottom: 1px solid #2a2a2a; background: #111;
    }
    .nav-logo { font-size: 1.1rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #fff; text-decoration: none; }
    .nav-logo span { color: #cc0000; }
    .nav-links { display: flex; align-items: center; gap: 20px; }
    .nav-links a { color: #aaa; text-decoration: none; font-size: 0.82rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .nav-links a:hover { color: #fff; }

    main {
      flex: 1; display: flex; align-items: flex-start; justify-content: center;
      padding: 60px 20px;
    }
    .signup-wrap { width: 100%; max-width: 480px; }

    .signup-header { text-align: center; margin-bottom: 36px; }
    .signup-header h1 { font-size: 1.8rem; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
    .signup-header p { color: #888; font-size: 0.88rem; }

    .card { background: #242424; padding: 36px; border: 1px solid #2e2e2e; }

    .error-box {
      background: #2a1f1f; border-left: 3px solid #cc0000;
      color: #ff8888; padding: 12px 16px; font-size: 0.85rem;
      margin-bottom: 20px;
    }

    .form-group { margin-bottom: 18px; }
    label { display: block; font-size: 0.78rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #888; margin-bottom: 7px; }
    input[type="text"], input[type="email"], input[type="password"] {
      width: 100%; background: #111; border: 1px solid #333; color: #fff;
      padding: 12px 14px; font-size: 0.9rem; outline: none;
    }
    input:focus { border-color: #cc0000; }
    .input-hint { font-size: 0.75rem; color: #555; margin-top: 5px; }
    .slug-preview { font-size: 0.78rem; color: #666; margin-top: 6px; }
    .slug-preview span { color: #cc0000; }

    .plan-note {
      background: #1f1f1f; border: 1px solid #2e2e2e;
      padding: 14px 16px; margin-bottom: 24px; font-size: 0.82rem; color: #888;
      display: flex; gap: 10px; align-items: flex-start;
    }
    .plan-note strong { color: #fff; }

    .btn-submit {
      width: 100%; background: #cc0000; color: #fff; border: none;
      padding: 14px; font-size: 0.9rem; font-weight: 900; letter-spacing: 1px;
      text-transform: uppercase; cursor: pointer; margin-bottom: 16px;
    }
    .btn-submit:hover { background: #aa0000; }

    .login-link { text-align: center; font-size: 0.82rem; color: #555; }
    .login-link a { color: #cc0000; text-decoration: none; }
    .login-link a:hover { text-decoration: underline; }

    footer {
      background: #111; border-top: 1px solid #222; padding: 24px 20px; text-align: center;
    }
    footer p { color: #444; font-size: 0.75rem; }
    footer a { color: #555; text-decoration: none; margin: 0 10px; }
    footer a:hover { color: #888; }
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
      <h1>Create Your Club</h1>
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
          Upgrade to Standard or Pro when pricing is announced to unlock the calendar feed and email notifications.</div>
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
