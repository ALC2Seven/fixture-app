function pricingPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pricing — FixtureApp</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,800;0,900;1,900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #eef0f4; --bg-2: #f6f7f9;
      --surface: #ffffff; --surface-2: #f4f5f8;
      --border: #e5e7eb; --border-2: #d1d5db;
      --text: #111827; --text-2: #4b5563; --text-3: #6b7280; --text-4: #9ca3af;
      --red: #e02828; --red-dark: #b91c1c;
      --navy: #0d1322; --navy-2: #131a30; --navy-text: #aeb6c8;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: 'Inter', Arial, sans-serif; line-height: 1.5; }

    nav.topnav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 36px; background: rgba(13,19,34,0.95); backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; z-index: 50;
    }
    .nav-logo { font-size: 1.05rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #fff; text-decoration: none; font-style: italic; }
    .nav-logo span { color: var(--red); }
    .nav-links { display: flex; align-items: center; gap: 26px; }
    .nav-links a { color: var(--navy-text); text-decoration: none; font-size: 0.84rem; font-weight: 600; }
    .nav-links a:hover { color: #fff; }
    .nav-cta { background: var(--red); color: #fff !important; padding: 10px 20px; border-radius: 8px; font-weight: 700 !important; }
    .nav-cta:hover { background: var(--red-dark) !important; }

    .hero {
      padding: 70px 24px 56px; text-align: center;
      background: radial-gradient(ellipse 70% 60% at 50% -10%, rgba(224,40,40,0.20), transparent),
                  linear-gradient(160deg, var(--navy-2), var(--navy));
      border-bottom: 3px solid var(--red);
    }
    .hero-tag {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16);
      color: var(--navy-text); font-size: 0.74rem; font-weight: 600;
      padding: 7px 16px; border-radius: 20px; margin-bottom: 24px;
    }
    .hero-tag::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--red); }
    .hero h1 { font-size: clamp(1.9rem, 4vw, 3rem); font-weight: 900; letter-spacing: -1px; margin-bottom: 14px; color: #fff; }
    .hero p { color: var(--navy-text); font-size: 1.02rem; max-width: 480px; margin: 0 auto; line-height: 1.65; }

    .section { max-width: 1020px; margin: 0 auto; padding: 56px 24px; }

    .tiers { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 22px; }
    .tier {
      background: var(--surface); padding: 36px 30px; border: 1px solid var(--border);
      border-radius: 16px; position: relative; display: flex; flex-direction: column;
    }
    .tier.featured { border-color: var(--red); box-shadow: 0 10px 40px rgba(224,40,40,0.18); }
    .tier-badge {
      position: absolute; top: -12px; left: 28px;
      background: var(--red); color: #fff; font-size: 0.62rem; font-weight: 800;
      letter-spacing: 1.5px; text-transform: uppercase; padding: 5px 12px; border-radius: 12px;
      white-space: nowrap;
    }
    .tier-name { font-size: 0.74rem; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; color: var(--text-3); margin-bottom: 12px; }
    .tier-price { font-size: 2.5rem; font-weight: 900; letter-spacing: -1px; margin-bottom: 4px; }
    .tier-price .currency { font-size: 1.2rem; vertical-align: top; margin-top: 8px; display: inline-block; }
    .tier-price .period { font-size: 0.85rem; font-weight: 400; color: var(--text-4); letter-spacing: 0; }
    .tier-note { color: var(--text-4); font-size: 0.78rem; margin-bottom: 22px; min-height: 20px; }
    .tier-desc { color: var(--text-2); font-size: 0.88rem; line-height: 1.55; margin-bottom: 22px; padding-bottom: 22px; border-bottom: 1px solid var(--border); }

    .feature-group { margin-bottom: 18px; }
    .feature-group-label { font-size: 0.66rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--text-4); margin-bottom: 8px; }
    .tier-features { list-style: none; }
    .tier-features li {
      font-size: 0.84rem; color: var(--text-2); padding: 7px 0;
      border-bottom: 1px solid var(--border); display: flex; gap: 10px; align-items: flex-start;
    }
    .tier-features li:last-child { border-bottom: none; }
    .tier-features li::before { content: "✓"; color: var(--red); font-weight: 900; flex-shrink: 0; margin-top: 1px; }
    .tier-features li.na { color: var(--text-4); }
    .tier-features li.na::before { content: "–"; color: var(--text-4); }

    .tier-cta { margin-top: auto; padding-top: 26px; }
    .btn {
      display: block; width: 100%; padding: 14px; text-align: center;
      font-size: 0.9rem; font-weight: 700; text-decoration: none; border: none;
      cursor: pointer; border-radius: 10px; transition: all 0.15s;
    }
    .btn-primary { background: var(--red); color: #fff; box-shadow: 0 6px 20px rgba(224,40,40,0.3); }
    .btn-primary:hover { background: var(--red-dark); transform: translateY(-1px); }
    .btn-ghost { background: var(--surface-2); color: var(--text); border: 1px solid var(--border-2); }
    .btn-ghost:hover { border-color: var(--text-3); }

    .faq { max-width: 680px; margin: 0 auto; }
    .faq h2 { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.5px; text-align: center; margin-bottom: 34px; }
    .faq-item { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 22px 26px; margin-bottom: 14px; }
    .faq-item h4 { font-size: 0.94rem; font-weight: 700; margin-bottom: 8px; }
    .faq-item p { color: var(--text-2); font-size: 0.86rem; line-height: 1.65; }

    footer { border-top: 1px solid var(--border); padding: 44px 24px; text-align: center; }
    footer .footer-logo { font-size: 0.9rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: var(--text-3); margin-bottom: 16px; font-style: italic; }
    footer .footer-logo span { color: var(--red); }
    footer .footer-nav { display: flex; justify-content: center; gap: 26px; margin-bottom: 20px; }
    footer .footer-nav a { color: var(--text-3); font-size: 0.8rem; text-decoration: none; }
    footer .footer-nav a:hover { color: var(--text-2); }
    footer p { color: var(--text-4); font-size: 0.75rem; }

    @media (max-width: 640px) {
      nav.topnav { padding: 13px 18px; }
      .nav-links { gap: 14px; }
      .nav-links a:not(.nav-cta) { display: none; }
      .hero { padding: 50px 18px 40px; }
      .section { padding: 40px 18px; }
      .tier { padding: 28px 22px; }
    }
  </style>
</head>
<body>

<nav class="topnav">
  <a href="/" class="nav-logo">Fixture<span>App</span></a>
  <div class="nav-links">
    <a href="/">Home</a>
    <a href="/dashboard/login">Club login</a>
    <a href="/signup" class="nav-cta">Start free</a>
  </div>
</nav>

<div class="hero">
  <div class="hero-tag">Pricing</div>
  <h1>Start free, upgrade when you're ready</h1>
  <p>No contracts, no hidden fees. Supporter accounts are always free — club plans grow with what you need.</p>
</div>

<div class="section" style="padding-top:20px">
  <div class="tiers">

    <!-- Free -->
    <div class="tier">
      <div class="tier-name">Free</div>
      <div class="tier-price"><span class="currency">£</span>0 <span class="period">/ month</span></div>
      <div class="tier-note">No credit card needed</div>
      <div class="tier-desc">Publish your season and manage fixtures, training and events at no cost.</div>
      <div class="feature-group">
        <div class="feature-group-label">Fixtures & Events</div>
        <ul class="tier-features">
          <li>Unlimited fixtures and training</li>
          <li>Weekly repeating events</li>
          <li>Excel / CSV season import</li>
          <li>Reschedule &amp; cancel</li>
        </ul>
      </div>
      <div class="feature-group">
        <div class="feature-group-label">Public Page</div>
        <ul class="tier-features">
          <li>Public fixtures &amp; events page</li>
          <li>Fixture type filters &amp; colour coding</li>
          <li class="na">Calendar subscribe button</li>
        </ul>
      </div>
      <div class="feature-group">
        <div class="feature-group-label">Communication</div>
        <ul class="tier-features">
          <li class="na">Live calendar feed</li>
          <li class="na">Email alerts &amp; reminders</li>
          <li class="na">One-tap RSVP from emails</li>
        </ul>
      </div>
      <div class="tier-cta">
        <a href="/signup" class="btn btn-ghost">Get started free</a>
      </div>
    </div>

    <!-- Standard -->
    <div class="tier featured">
      <div class="tier-badge">Most popular</div>
      <div class="tier-name">Standard</div>
      <div class="tier-price">TBC <span class="period">/ month</span></div>
      <div class="tier-note" style="color:var(--red)">Pricing coming soon</div>
      <div class="tier-desc">The full communication loop — calendars, alerts, reminders and availability.</div>
      <div class="feature-group">
        <div class="feature-group-label">Fixtures & Events</div>
        <ul class="tier-features">
          <li>Everything in Free</li>
        </ul>
      </div>
      <div class="feature-group">
        <div class="feature-group-label">Public Page</div>
        <ul class="tier-features">
          <li>Calendar subscribe button</li>
          <li>Supporter one-tap availability</li>
        </ul>
      </div>
      <div class="feature-group">
        <div class="feature-group-label">Communication</div>
        <ul class="tier-features">
          <li>Live calendar feed (Google / Apple / Outlook)</li>
          <li>Email alerts for reschedules, cancellations &amp; venue changes</li>
          <li>Automatic event reminders</li>
          <li>One-tap RSVP from emails — no login</li>
          <li>Subscriber management</li>
        </ul>
      </div>
      <div class="tier-cta">
        <a href="/signup" class="btn btn-primary">Sign up — get notified</a>
      </div>
    </div>

    <!-- Pro -->
    <div class="tier">
      <div class="tier-name">Pro</div>
      <div class="tier-price">TBC <span class="period">/ month</span></div>
      <div class="tier-note" style="color:var(--red)">Pricing coming soon</div>
      <div class="tier-desc">For clubs and organisations that want the full experience.</div>
      <div class="feature-group">
        <div class="feature-group-label">Everything in Standard</div>
        <ul class="tier-features">
          <li>Priority support</li>
          <li>Early access to new features</li>
          <li>More coming soon</li>
        </ul>
      </div>
      <div class="tier-cta">
        <a href="/signup" class="btn btn-ghost">Sign up — get notified</a>
      </div>
    </div>

  </div>
</div>

<!-- FAQ -->
<div class="section" style="padding-top:24px">
  <div class="faq">
    <h2>Questions</h2>
    <div class="faq-item">
      <h4>Does the free plan stay free?</h4>
      <p>Yes. The free tier will always be available. You get your public fixtures page and full fixture and event management at no cost.</p>
    </div>
    <div class="faq-item">
      <h4>How does the calendar feed work?</h4>
      <p>Your club gets a unique calendar URL. Supporters add it to Google Calendar, Apple Calendar or Outlook once. Every change — reschedule, cancellation, new game, training session — updates in their calendar automatically.</p>
    </div>
    <div class="faq-item">
      <h4>How does one-tap availability work?</h4>
      <p>Supporters tap Going, Maybe or Can't on the fixture page or straight from the reminder email — no login needed from email. You see the headcount for every event in your dashboard.</p>
    </div>
    <div class="faq-item">
      <h4>When will Standard and Pro pricing be confirmed?</h4>
      <p>We're finalising pricing now. Sign up free today and we'll notify you as soon as paid plans go live.</p>
    </div>
    <div class="faq-item">
      <h4>Can I switch plans later?</h4>
      <p>Yes — upgrade or downgrade at any time. Your fixtures and data are always yours.</p>
    </div>
  </div>
</div>

<footer>
  <div class="footer-logo">Fixture<span>App</span></div>
  <div class="footer-nav">
    <a href="/">Home</a>
    <a href="/signup">Club sign up</a>
    <a href="/fan/signup">Supporter sign up</a>
    <a href="/dashboard/login">Club login</a>
  </div>
  <p>© ${new Date().getFullYear()} FixtureApp. Built for grassroots sport.</p>
</footer>

</body>
</html>`;
}

module.exports = { pricingPage };
