function pricingPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pricing — FixtureApp</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #1a1a1a; color: #fff; font-family: Arial, sans-serif; }

    nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 40px; border-bottom: 1px solid #2a2a2a; background: #111;
      position: sticky; top: 0; z-index: 50;
    }
    .nav-logo { font-size: 1.1rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #fff; text-decoration: none; }
    .nav-logo span { color: #cc0000; }
    .nav-links { display: flex; align-items: center; gap: 24px; }
    .nav-links a { color: #aaa; text-decoration: none; font-size: 0.85rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .nav-links a:hover { color: #fff; }
    .nav-cta { background: #cc0000; color: #fff !important; padding: 10px 20px; }
    .nav-cta:hover { background: #aa0000 !important; }

    .hero {
      padding: 70px 20px 60px; text-align: center;
      border-bottom: 1px solid #2a2a2a;
    }
    .hero-tag {
      display: inline-block; background: #cc0000; color: #fff;
      font-size: 0.7rem; font-weight: 900; letter-spacing: 3px;
      text-transform: uppercase; padding: 6px 14px; margin-bottom: 20px;
    }
    .hero h1 {
      font-size: clamp(1.8rem, 4vw, 3rem); font-weight: 900;
      text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px;
    }
    .hero p { color: #888; font-size: 1rem; max-width: 480px; margin: 0 auto; line-height: 1.6; }

    .section { max-width: 960px; margin: 0 auto; padding: 70px 20px; }

    .tiers { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
    .tier {
      background: #242424; padding: 36px 30px; border: 1px solid #2e2e2e;
      position: relative; display: flex; flex-direction: column;
    }
    .tier.featured { border-color: #cc0000; }
    .tier-badge {
      position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
      background: #cc0000; color: #fff; font-size: 0.65rem; font-weight: 900;
      letter-spacing: 2px; text-transform: uppercase; padding: 4px 14px;
      white-space: nowrap;
    }
    .tier-name { font-size: 0.75rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #888; margin-bottom: 12px; }
    .tier-price { font-size: 2.6rem; font-weight: 900; margin-bottom: 4px; }
    .tier-price .currency { font-size: 1.2rem; vertical-align: top; margin-top: 8px; display: inline-block; }
    .tier-price .period { font-size: 0.85rem; font-weight: 400; color: #666; }
    .tier-note { color: #555; font-size: 0.78rem; margin-bottom: 24px; min-height: 20px; }
    .tier-desc { color: #888; font-size: 0.88rem; line-height: 1.5; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #2e2e2e; }

    .feature-group { margin-bottom: 20px; }
    .feature-group-label { font-size: 0.68rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #555; margin-bottom: 10px; }
    .tier-features { list-style: none; }
    .tier-features li {
      font-size: 0.83rem; color: #aaa; padding: 7px 0;
      border-bottom: 1px solid #2a2a2a; display: flex; gap: 10px; align-items: flex-start;
    }
    .tier-features li:last-child { border-bottom: none; }
    .tier-features li::before { content: "✓"; color: #cc0000; font-weight: 900; flex-shrink: 0; margin-top: 1px; }
    .tier-features li.na { color: #444; }
    .tier-features li.na::before { content: "–"; color: #3a3a3a; }

    .tier-cta { margin-top: auto; padding-top: 28px; }
    .btn {
      display: block; width: 100%; padding: 14px; text-align: center;
      font-size: 0.85rem; font-weight: 900; letter-spacing: 1px;
      text-transform: uppercase; text-decoration: none; border: none; cursor: pointer;
    }
    .btn-primary { background: #cc0000; color: #fff; }
    .btn-primary:hover { background: #aa0000; }
    .btn-outline { background: transparent; color: #fff; border: 2px solid #444; }
    .btn-outline:hover { border-color: #fff; }
    .btn-disabled { background: #2a2a2a; color: #555; cursor: default; border: 2px solid #2a2a2a; }

    .faq { max-width: 680px; margin: 0 auto; }
    .faq h2 { font-size: 1.4rem; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 36px; }
    .faq-item { border-bottom: 1px solid #2a2a2a; padding: 20px 0; }
    .faq-item h4 { font-size: 0.9rem; font-weight: 700; margin-bottom: 8px; }
    .faq-item p { color: #888; font-size: 0.85rem; line-height: 1.6; }

    footer {
      background: #111; border-top: 1px solid #222;
      padding: 40px 20px; text-align: center;
    }
    footer .footer-logo { font-size: 0.9rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #555; margin-bottom: 14px; }
    footer .footer-logo span { color: #cc0000; }
    footer .footer-nav { display: flex; justify-content: center; gap: 24px; margin-bottom: 20px; }
    footer .footer-nav a { color: #555; font-size: 0.78rem; text-decoration: none; letter-spacing: 1px; text-transform: uppercase; }
    footer .footer-nav a:hover { color: #888; }
    footer p { color: #444; font-size: 0.75rem; }
  </style>
</head>
<body>

<nav>
  <a href="/" class="nav-logo">Fixture<span>App</span></a>
  <div class="nav-links">
    <a href="/pricing">Pricing</a>
    <a href="/dashboard/login">Login</a>
    <a href="/signup" class="nav-cta">Get Started Free</a>
  </div>
</nav>

<div class="hero">
  <div class="hero-tag">Pricing</div>
  <h1>Simple Plans for Every Club</h1>
  <p>Start free, upgrade when you're ready. No contracts, no hidden fees.</p>
</div>

<div class="section">
  <div class="tiers">

    <!-- Free -->
    <div class="tier">
      <div class="tier-name">Free</div>
      <div class="tier-price"><span class="currency">£</span>0 <span class="period">/ month</span></div>
      <div class="tier-note">No credit card needed</div>
      <div class="tier-desc">Get your club set up and manage your fixtures at no cost.</div>
      <div class="feature-group">
        <div class="feature-group-label">Fixtures</div>
        <ul class="tier-features">
          <li>Unlimited fixtures</li>
          <li>Manual add &amp; edit</li>
          <li>Excel / CSV bulk import</li>
          <li>Reschedule &amp; cancel</li>
        </ul>
      </div>
      <div class="feature-group">
        <div class="feature-group-label">Public Page</div>
        <ul class="tier-features">
          <li>Public fixtures webpage</li>
          <li>Upcoming &amp; past fixtures</li>
          <li class="na">Calendar subscribe button</li>
        </ul>
      </div>
      <div class="feature-group">
        <div class="feature-group-label">Notifications</div>
        <ul class="tier-features">
          <li class="na">Live ICS calendar feed</li>
          <li class="na">Email notifications</li>
        </ul>
      </div>
      <div class="tier-cta">
        <a href="/signup" class="btn btn-outline">Get Started Free</a>
      </div>
    </div>

    <!-- Standard -->
    <div class="tier featured">
      <div class="tier-badge">Most Popular</div>
      <div class="tier-name">Standard</div>
      <div class="tier-price">TBC <span class="period">/ month</span></div>
      <div class="tier-note" style="color:#cc0000">Pricing coming soon</div>
      <div class="tier-desc">Everything clubs need to keep fans automatically updated.</div>
      <div class="feature-group">
        <div class="feature-group-label">Fixtures</div>
        <ul class="tier-features">
          <li>Everything in Free</li>
        </ul>
      </div>
      <div class="feature-group">
        <div class="feature-group-label">Public Page</div>
        <ul class="tier-features">
          <li>Public fixtures webpage</li>
          <li>Calendar subscribe button</li>
        </ul>
      </div>
      <div class="feature-group">
        <div class="feature-group-label">Notifications</div>
        <ul class="tier-features">
          <li>Live ICS calendar feed</li>
          <li>Email notifications on reschedule</li>
          <li>Subscriber management</li>
        </ul>
      </div>
      <div class="tier-cta">
        <a href="/signup" class="btn btn-primary">Sign Up — Notify Me</a>
      </div>
    </div>

    <!-- Pro -->
    <div class="tier">
      <div class="tier-name">Pro</div>
      <div class="tier-price">TBC <span class="period">/ month</span></div>
      <div class="tier-note" style="color:#cc0000">Pricing coming soon</div>
      <div class="tier-desc">For clubs and organisations that want the full experience.</div>
      <div class="feature-group">
        <div class="feature-group-label">Fixtures</div>
        <ul class="tier-features">
          <li>Everything in Standard</li>
        </ul>
      </div>
      <div class="feature-group">
        <div class="feature-group-label">Pro Features</div>
        <ul class="tier-features">
          <li>Priority support</li>
          <li>Early access to new features</li>
          <li>More coming soon</li>
        </ul>
      </div>
      <div class="tier-cta">
        <a href="/signup" class="btn btn-outline">Sign Up — Notify Me</a>
      </div>
    </div>

  </div>
</div>

<!-- FAQ -->
<div class="section" style="padding-top:20px">
  <div class="faq">
    <h2>Questions</h2>
    <div class="faq-item">
      <h4>Does the free plan stay free?</h4>
      <p>Yes. The free tier will always be available. You get your public fixtures page and full fixture management at no cost.</p>
    </div>
    <div class="faq-item">
      <h4>How does the calendar feed work?</h4>
      <p>Your club gets a unique ICS URL. Fans add it to Google Calendar, Apple Calendar or Outlook once. Every fixture change — reschedule, cancellation, new game — updates in their calendar automatically.</p>
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
    <a href="/pricing">Pricing</a>
    <a href="/signup">Sign Up</a>
    <a href="/dashboard/login">Login</a>
  </div>
  <p>© ${new Date().getFullYear()} FixtureApp. Built for sports clubs.</p>
</footer>

</body>
</html>`;
}

module.exports = { pricingPage };
