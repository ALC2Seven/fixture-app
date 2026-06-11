function homepagePage(flash) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FixtureApp — Fixtures, training & availability. Sorted.</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,800;0,900;1,900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #eef0f4;
      --bg-2: #f6f7f9;
      --surface: #ffffff;
      --surface-2: #f4f5f8;
      --border: #e5e7eb;
      --border-2: #d1d5db;
      --text: #111827;
      --text-2: #4b5563;
      --text-3: #6b7280;
      --text-4: #9ca3af;
      --red: #e02828;
      --red-dark: #b91c1c;
      --shadow: 0 8px 30px rgba(16,24,40,0.08);
      /* dark band (nav + hero) */
      --navy: #0d1322;
      --navy-2: #131a30;
      --navy-text: #aeb6c8;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--text); font-family: 'Inter', Arial, sans-serif; line-height: 1.5; }

    /* Nav — stays a dark navy band over the light page */
    nav.topnav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 36px; background: rgba(13,19,34,0.95); backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      position: sticky; top: 0; z-index: 50;
    }
    .nav-logo { font-size: 1.05rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #fff; text-decoration: none; font-style: italic; }
    .nav-logo span { color: var(--red); }
    .nav-links { display: flex; align-items: center; gap: 26px; }
    .nav-links a { color: var(--navy-text); text-decoration: none; font-size: 0.84rem; font-weight: 600; }
    .nav-links a:hover { color: #fff; }
    .nav-cta {
      background: var(--red); color: #fff !important; padding: 10px 20px;
      border-radius: 8px; font-weight: 700 !important;
    }
    .nav-cta:hover { background: var(--red-dark) !important; }

    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 14px 28px; font-size: 0.92rem; font-weight: 700;
      text-decoration: none; border: none; cursor: pointer; border-radius: 10px;
      transition: all 0.15s;
    }
    .btn-primary { background: var(--red); color: #fff; box-shadow: 0 6px 20px rgba(224,40,40,0.35); }
    .btn-primary:hover { background: var(--red-dark); transform: translateY(-1px); }
    .btn-ghost { background: var(--surface); color: var(--text); border: 1px solid var(--border-2); }
    .btn-ghost:hover { border-color: var(--text-3); }

    /* Hero — navy band over the light page */
    .hero {
      position: relative; overflow: hidden;
      padding: 90px 24px 70px; text-align: center;
      background:
        radial-gradient(ellipse 70% 50% at 50% -10%, rgba(224,40,40,0.20), transparent),
        linear-gradient(160deg, var(--navy-2), var(--navy));
      border-bottom: 3px solid var(--red);
    }
    .hero-tag {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16);
      color: var(--navy-text); font-size: 0.74rem; font-weight: 600;
      padding: 7px 16px; border-radius: 20px; margin-bottom: 28px;
    }
    .hero-tag::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--red); }
    .hero h1 {
      font-size: clamp(2.3rem, 5.5vw, 4rem); font-weight: 900; letter-spacing: -1.5px;
      line-height: 1.05; max-width: 820px; margin: 0 auto 22px; color: #fff;
    }
    .hero h1 em { font-style: italic; color: var(--red); }
    .hero > p {
      color: var(--navy-text); font-size: 1.12rem; max-width: 600px;
      margin: 0 auto 36px; line-height: 1.65;
    }
    .hero-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin-bottom: 64px; }

    /* Product mockup card */
    .mock-wrap { max-width: 620px; margin: 0 auto; text-align: left; }
    .mock-tab {
      display: inline-block; background: #1b2240; color: #fff;
      font-size: 0.66rem; font-weight: 900; letter-spacing: 1.5px;
      text-transform: uppercase; padding: 8px 18px; border-radius: 8px 8px 0 0;
    }
    .mock-card {
      background: var(--surface); border: 1px solid var(--border-2);
      border-radius: 0 14px 14px 14px; box-shadow: var(--shadow); padding: 22px 26px;
    }
    .mock-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 14px; }
    .mock-team { font-weight: 900; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .mock-centre { text-align: center; }
    .mock-pills { display: flex; gap: 6px; justify-content: center; margin-bottom: 6px; }
    .mock-pill { font-size: 0.56rem; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; padding: 3px 9px; border-radius: 10px; }
    .mock-time { font-size: 1.5rem; font-weight: 900; }
    .mock-venue { font-size: 0.72rem; color: var(--text-3); margin-top: 2px; }
    .mock-rsvp {
      display: flex; gap: 8px; align-items: center; justify-content: center; flex-wrap: wrap;
      margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--border-2);
    }
    .mock-rsvp-label { font-size: 0.62rem; color: var(--text-4); text-transform: uppercase; letter-spacing: 1px; }
    .mock-rsvp-btn {
      font-size: 0.7rem; font-weight: 700; padding: 6px 14px; border-radius: 14px;
      border: 1px solid var(--border-2); color: var(--text-2); background: transparent;
    }
    .mock-rsvp-btn.on { background: #1a7a2e; border-color: #1a7a2e; color: #fff; }
    .mock-count { font-size: 0.7rem; color: var(--text-3); font-weight: 700; }
    .mock-caption { text-align: center; color: #7c8499; font-size: 0.76rem; margin-top: 14px; }

    /* Sections */
    .section { max-width: 1020px; margin: 0 auto; padding: 84px 24px; }
    .section-label {
      font-size: 0.72rem; font-weight: 800; letter-spacing: 3px;
      text-transform: uppercase; color: var(--red); margin-bottom: 14px; text-align: center;
    }
    .section h2 {
      font-size: clamp(1.7rem, 3.2vw, 2.5rem); font-weight: 900; letter-spacing: -0.8px;
      text-align: center; margin-bottom: 18px;
    }
    .section .sub {
      text-align: center; color: var(--text-2); max-width: 560px;
      margin: 0 auto 52px; font-size: 1rem;
    }
    .divider { border: none; border-top: 1px solid var(--border); max-width: 1020px; margin: 0 auto; }

    /* Steps */
    .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 22px; }
    .step {
      background: var(--surface); padding: 34px 30px; border: 1px solid var(--border);
      border-radius: 16px; transition: all 0.2s; position: relative;
    }
    .step:hover { border-color: var(--border-2); transform: translateY(-3px); }
    .step-num {
      display: inline-flex; align-items: center; justify-content: center;
      width: 38px; height: 38px; background: linear-gradient(135deg, var(--red), var(--red-dark));
      color: #fff; font-size: 1.05rem; font-weight: 900; border-radius: 10px; margin-bottom: 18px;
    }
    .step h3 { font-size: 1.05rem; font-weight: 800; margin-bottom: 10px; letter-spacing: -0.3px; }
    .step p { color: var(--text-2); font-size: 0.9rem; line-height: 1.65; }

    /* Features */
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; }
    .feature {
      background: var(--surface); padding: 26px 26px; border: 1px solid var(--border);
      border-radius: 14px; transition: all 0.2s;
    }
    .feature:hover { border-color: rgba(224,40,40,0.45); }
    .feature-icon {
      font-size: 1.3rem; margin-bottom: 14px; width: 44px; height: 44px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--surface-2); border-radius: 11px;
    }
    .feature h4 { font-size: 0.96rem; font-weight: 800; margin-bottom: 7px; letter-spacing: -0.2px; }
    .feature p { color: var(--text-2); font-size: 0.86rem; line-height: 1.6; }

    /* Audience split */
    .split { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 22px; }
    .split-card {
      border-radius: 18px; padding: 38px 34px; border: 1px solid var(--border);
      background: linear-gradient(160deg, var(--surface), var(--bg-2));
    }
    .split-card.club { border-top: 3px solid var(--red); }
    .split-card.fan { border-top: 3px solid #3b82f6; }
    .split-kicker { font-size: 0.7rem; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 12px; }
    .split-card.club .split-kicker { color: var(--red); }
    .split-card.fan .split-kicker { color: #3b82f6; }
    .split-card h3 { font-size: 1.35rem; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 12px; }
    .split-card p { color: var(--text-2); font-size: 0.92rem; margin-bottom: 24px; line-height: 1.65; }
    .split-card ul { list-style: none; margin: 0 0 28px; }
    .split-card li { font-size: 0.88rem; color: var(--text-2); padding: 7px 0; display: flex; gap: 10px; }
    .split-card li::before { content: "✓"; font-weight: 900; flex-shrink: 0; }
    .split-card.club li::before { color: var(--red); }
    .split-card.fan li::before { color: #3b82f6; }
    .btn-blue { background: #3b82f6; color: #fff; }
    .btn-blue:hover { background: #2563eb; }

    /* Tiers */
    .tiers { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
    .tier {
      background: var(--surface); padding: 34px 30px; text-align: left;
      border: 1px solid var(--border); border-radius: 16px; position: relative;
    }
    .tier.featured { border-color: var(--red); box-shadow: 0 10px 40px rgba(224,40,40,0.18); }
    .tier-badge {
      position: absolute; top: -12px; left: 28px;
      background: var(--red); color: #fff; font-size: 0.62rem; font-weight: 800;
      letter-spacing: 1.5px; text-transform: uppercase; padding: 5px 12px; border-radius: 12px;
    }
    .tier-name { font-size: 0.74rem; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; color: var(--text-3); margin-bottom: 14px; }
    .tier-price { font-size: 2.3rem; font-weight: 900; letter-spacing: -1px; margin-bottom: 4px; }
    .tier-price span { font-size: 0.85rem; font-weight: 400; color: var(--text-4); letter-spacing: 0; }
    .tier-desc { color: var(--text-3); font-size: 0.84rem; margin: 12px 0 18px; }
    .tier-features { list-style: none; margin: 0 0 26px; }
    .tier-features li { font-size: 0.84rem; color: var(--text-2); padding: 7px 0; border-bottom: 1px solid var(--border); display: flex; gap: 10px; }
    .tier-features li::before { content: "✓"; color: var(--red); font-weight: 900; flex-shrink: 0; }
    .tier-features li.na { color: var(--text-4); }
    .tier-features li.na::before { content: "–"; color: var(--text-4); }

    /* CTA band */
    .cta-band {
      background: linear-gradient(135deg, var(--red), #8f1414);
      padding: 76px 24px; text-align: center; border-radius: 24px;
      max-width: 1020px; margin: 0 auto 84px; color: #fff;
      box-shadow: 0 14px 40px rgba(224,40,40,0.25);
    }
    .cta-band h2 { font-size: clamp(1.7rem, 3vw, 2.3rem); font-weight: 900; letter-spacing: -0.8px; margin-bottom: 14px; }
    .cta-band p { color: rgba(255,255,255,0.85); margin-bottom: 32px; font-size: 1rem; }
    .btn-white { background: #fff; color: var(--red); }
    .btn-white:hover { background: #f1f1f1; transform: translateY(-1px); }

    /* Footer */
    footer { border-top: 1px solid var(--border); padding: 44px 24px; text-align: center; }
    footer .footer-logo { font-size: 0.9rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: var(--text-3); margin-bottom: 16px; font-style: italic; }
    footer .footer-logo span { color: var(--red); }
    footer nav { display: flex; justify-content: center; gap: 26px; margin-bottom: 20px; }
    footer nav a { color: var(--text-3); font-size: 0.8rem; text-decoration: none; }
    footer nav a:hover { color: var(--text-2); }
    footer p { color: var(--text-4); font-size: 0.75rem; }

    /* Mobile */
    @media (max-width: 640px) {
      nav.topnav { padding: 13px 18px; }
      .nav-links { gap: 14px; }
      .nav-links a:not(.nav-cta) { display: none; }
      .nav-cta { padding: 8px 14px; font-size: 0.78rem; }
      .hero { padding: 56px 18px 44px; }
      .hero-actions { margin-bottom: 44px; }
      .btn { padding: 12px 20px; font-size: 0.85rem; }
      .section { padding: 54px 18px; }
      .section .sub { margin-bottom: 34px; }
      .mock-card { padding: 16px; }
      .mock-row { grid-template-columns: 1fr; gap: 6px; text-align: center; }
      .mock-team { font-size: 0.85rem; }
      .cta-band { border-radius: 0; margin-bottom: 0; }
    }

    ${flash ? `
    .flash { background: #f0fdf4; border-left: 3px solid #22c55e; color: #166534; padding: 12px 20px; text-align: center; font-size: 0.85rem; }
    .flash.error { background: #fef2f2; border-left-color: #ef4444; color: #b91c1c; }
    ` : ""}
  </style>
</head>
<body>

<nav class="topnav">
  <a href="/" class="nav-logo">Fixture<span>App</span></a>
  <div class="nav-links">
    <a href="#how">How it works</a>
    <a href="/pricing">Pricing</a>
    <a href="/dashboard/login">Club login</a>
    <a href="/fan/login">Supporter login</a>
    <a href="/signup" class="nav-cta">Start free</a>
  </div>
</nav>

${flash ? `<div class="flash ${flash.type === "error" ? "error" : ""}">${flash.msg}</div>` : ""}

<!-- Hero -->
<div class="hero">
  <div class="hero-tag">Fixtures · Training · Availability · Calendars</div>
  <h1>Your club's season,<br>organised in <em>one tap</em>.</h1>
  <p>Publish fixtures and training once. Parents and supporters tap <strong>Going / Maybe / Can't</strong>, their calendars stay in sync, and every change reaches everyone — automatically.</p>
  <div class="hero-actions">
    <a href="/signup" class="btn btn-primary">Set up your club — free</a>
    <a href="#how" class="btn btn-ghost">See how it works</a>
  </div>

  <!-- Product mockup -->
  <div class="mock-wrap">
    <div class="mock-tab">Sat 14 Jun</div>
    <div class="mock-card">
      <div class="mock-row">
        <div class="mock-team" style="text-align:right">City FC</div>
        <div class="mock-centre">
          <div class="mock-pills">
            <span class="mock-pill" style="background:var(--red);color:#fff">Home</span>
            <span class="mock-pill" style="background:#fef3c7;color:#92400e">Cup</span>
          </div>
          <div class="mock-time">15:00</div>
          <div class="mock-venue">Riverside Stadium</div>
        </div>
        <div class="mock-team">United AFC</div>
      </div>
      <div class="mock-rsvp">
        <span class="mock-rsvp-label">Your availability:</span>
        <span class="mock-rsvp-btn on">✓ Going</span>
        <span class="mock-rsvp-btn">? Maybe</span>
        <span class="mock-rsvp-btn">✗ Can't</span>
        <span class="mock-count">14 going</span>
      </div>
    </div>
    <div class="mock-caption">The live fixture card your supporters see — RSVP included.</div>
  </div>
</div>

<hr class="divider">

<!-- How it works -->
<div class="section" id="how">
  <div class="section-label">How it works</div>
  <h2>Faster than the group chat</h2>
  <p class="sub">Three steps replace the WhatsApp scramble, the spreadsheet and the "what time is kick-off?" messages.</p>
  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <h3>Publish your season</h3>
      <p>Add fixtures one by one, import a whole season from a spreadsheet, or set training to repeat weekly. Cup games, tournaments and festivals are colour-coded automatically.</p>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <h3>Share one link</h3>
      <p>Your club gets a clean public page. Supporters subscribe once — that connects their calendar, email alerts and availability in a single tap.</p>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <h3>Everything stays in sync</h3>
      <p>Reschedule, cancel or move a venue and every subscribed calendar updates itself. Reminders go out before each event with one-tap RSVP — no login needed.</p>
    </div>
  </div>
</div>

<hr class="divider">

<!-- Features -->
<div class="section">
  <div class="section-label">Features</div>
  <h2>Built for the people who actually run the club</h2>
  <p class="sub">Everything a volunteer coach or team manager touches every week — and nothing they don't.</p>
  <div class="features">
    <div class="feature">
      <div class="feature-icon">🖐️</div>
      <h4>One-tap availability</h4>
      <p>Going, Maybe or Can't — straight from the fixture page or the reminder email. You see the headcount before you pick the squad.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">⏰</div>
      <h4>Automatic reminders</h4>
      <p>Every subscriber gets a reminder before each fixture and training session, with RSVP buttons built in. No chasing.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">📅</div>
      <h4>Live calendar sync</h4>
      <p>Works with Google, Apple and Outlook. Reschedule once and every phone updates itself — no messages needed.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">🏃</div>
      <h4>Training & events</h4>
      <p>Not just match days. Weekly training, meetings, socials and volunteer duties — set them to repeat for the whole season in one go.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">✉️</div>
      <h4>Change alerts</h4>
      <p>Cancellations, reschedules and venue changes are emailed to everyone automatically, so nobody turns up at the wrong pitch.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">📤</div>
      <h4>Season import</h4>
      <p>Upload the whole fixture list from Excel or CSV in seconds with our template — types, venues and competitions included.</p>
    </div>
  </div>
</div>

<hr class="divider">

<!-- Audience split -->
<div class="section">
  <div class="section-label">Who it's for</div>
  <h2>Two sides, one source of truth</h2>
  <p class="sub">Clubs manage everything in one place. Supporters and parents get one link that just works.</p>
  <div class="split">
    <div class="split-card club">
      <div class="split-kicker">For clubs & coaches</div>
      <h3>Run your season from one dashboard</h3>
      <p>Fixtures, training, availability and communication — without spreadsheets or five different apps.</p>
      <ul>
        <li>Add or import the full season in minutes</li>
        <li>See who's coming before every event</li>
        <li>Reschedules reach everyone automatically</li>
      </ul>
      <a href="/signup" class="btn btn-primary">Create your club page</a>
    </div>
    <div class="split-card fan">
      <div class="split-kicker">For parents & supporters</div>
      <h3>Never miss a kick-off again</h3>
      <p>One free account covers every team you follow — your kids' teams, your local club, all of it.</p>
      <ul>
        <li>Fixtures and training in your own calendar</li>
        <li>One-tap RSVP from the page or your email</li>
        <li>Instant alerts when anything changes</li>
      </ul>
      <a href="/fan/signup" class="btn btn-blue">Create a free supporter account</a>
    </div>
  </div>
</div>

<hr class="divider">

<!-- Tier preview -->
<div class="section">
  <div class="section-label">Plans</div>
  <h2>Start free, upgrade when you're ready</h2>
  <p class="sub">Supporter accounts are always free. Club plans grow with what you need.</p>
  <div class="tiers">

    <div class="tier">
      <div class="tier-name">Free</div>
      <div class="tier-price">£0 <span>/ month</span></div>
      <div class="tier-desc">Everything you need to publish your season.</div>
      <ul class="tier-features">
        <li>Public fixtures & events page</li>
        <li>Unlimited fixtures and training</li>
        <li>Weekly repeating events</li>
        <li>CSV / Excel season import</li>
        <li class="na">Calendar subscription feed</li>
        <li class="na">Email alerts & reminders</li>
      </ul>
      <a href="/signup" class="btn btn-ghost" style="width:100%">Get started</a>
    </div>

    <div class="tier featured">
      <div class="tier-badge">Most popular</div>
      <div class="tier-name">Standard</div>
      <div class="tier-price">TBC <span>/ month</span></div>
      <div class="tier-desc">The full communication loop for your supporters.</div>
      <ul class="tier-features">
        <li>Everything in Free</li>
        <li>Live calendar feed (Google / Apple / Outlook)</li>
        <li>Email alerts for every change</li>
        <li>Automatic event reminders</li>
        <li>One-tap RSVP from emails</li>
      </ul>
      <a href="/pricing" class="btn btn-primary" style="width:100%">View pricing</a>
    </div>

    <div class="tier">
      <div class="tier-name">Pro</div>
      <div class="tier-price">TBC <span>/ month</span></div>
      <div class="tier-desc">For clubs and organisations wanting the full package.</div>
      <ul class="tier-features">
        <li>Everything in Standard</li>
        <li>Priority support</li>
        <li>Early access to new features</li>
        <li>More coming soon</li>
      </ul>
      <a href="/pricing" class="btn btn-ghost" style="width:100%">View pricing</a>
    </div>

  </div>
</div>

<!-- CTA band -->
<div class="cta-band">
  <h2>Set up your club in minutes</h2>
  <p>Free to start. No credit card. Your public fixtures page is live the moment you sign up.</p>
  <a href="/signup" class="btn btn-white">Create your club — free</a>
</div>

<footer>
  <div class="footer-logo">Fixture<span>App</span></div>
  <nav>
    <a href="/pricing">Pricing</a>
    <a href="/signup">Club sign up</a>
    <a href="/fan/signup">Supporter sign up</a>
    <a href="/dashboard/login">Club login</a>
  </nav>
  <p>© ${new Date().getFullYear()} FixtureApp. Built for grassroots sport.</p>
</footer>

</body>
</html>`;
}

module.exports = { homepagePage };
