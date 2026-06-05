function homepagePage(flash) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FixtureApp — Live Calendar Feeds for Sports Clubs</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #1a1a1a; color: #fff; font-family: Arial, sans-serif; }

    /* Nav */
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

    /* Hero */
    .hero {
      background: linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(26,26,26,1)),
                  url('https://images.unsplash.com/photo-1552667466-07770ae110d0?w=1400&q=80') center/cover no-repeat;
      padding: 100px 20px 90px; text-align: center;
    }
    .hero-tag {
      display: inline-block; background: #cc0000; color: #fff;
      font-size: 0.7rem; font-weight: 900; letter-spacing: 3px;
      text-transform: uppercase; padding: 6px 14px; margin-bottom: 24px;
    }
    .hero h1 {
      font-size: clamp(2.2rem, 5vw, 4rem); font-weight: 900;
      letter-spacing: 2px; text-transform: uppercase; line-height: 1.1;
      max-width: 760px; margin: 0 auto 20px;
    }
    .hero h1 span { color: #cc0000; }
    .hero p {
      color: #aaa; font-size: 1.1rem; max-width: 520px;
      margin: 0 auto 36px; line-height: 1.6;
    }
    .hero-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 14px 28px; font-size: 0.9rem; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase; text-decoration: none;
      border: none; cursor: pointer;
    }
    .btn-primary { background: #cc0000; color: #fff; }
    .btn-primary:hover { background: #aa0000; }
    .btn-outline { background: transparent; color: #fff; border: 2px solid #444; }
    .btn-outline:hover { border-color: #fff; }

    /* Section */
    .section { max-width: 960px; margin: 0 auto; padding: 80px 20px; }
    .section-label {
      font-size: 0.7rem; font-weight: 900; letter-spacing: 3px;
      text-transform: uppercase; color: #cc0000; margin-bottom: 12px; text-align: center;
    }
    .section h2 {
      font-size: clamp(1.6rem, 3vw, 2.4rem); font-weight: 900;
      text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 50px;
    }
    .divider { border: none; border-top: 1px solid #2a2a2a; }

    /* Steps */
    .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 30px; }
    .step {
      background: #242424; padding: 32px 28px; border-top: 3px solid #cc0000; text-align: center;
    }
    .step-num {
      display: inline-block; width: 40px; height: 40px; background: #cc0000;
      color: #fff; font-size: 1.2rem; font-weight: 900; line-height: 40px;
      text-align: center; margin-bottom: 16px;
    }
    .step h3 { font-size: 1rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .step p { color: #888; font-size: 0.88rem; line-height: 1.6; }

    /* Features */
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .feature {
      background: #242424; padding: 24px; border-left: 3px solid #333;
      transition: border-color 0.2s;
    }
    .feature:hover { border-left-color: #cc0000; }
    .feature-icon { font-size: 1.6rem; margin-bottom: 12px; }
    .feature h4 { font-size: 0.88rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .feature p { color: #888; font-size: 0.82rem; line-height: 1.5; }

    /* Tier preview */
    .tiers { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
    .tier {
      background: #242424; padding: 32px 28px; text-align: center; border: 1px solid #2e2e2e;
      position: relative;
    }
    .tier.featured { border-color: #cc0000; }
    .tier-badge {
      position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
      background: #cc0000; color: #fff; font-size: 0.65rem; font-weight: 900;
      letter-spacing: 2px; text-transform: uppercase; padding: 4px 12px;
    }
    .tier-name { font-size: 0.75rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #888; margin-bottom: 12px; }
    .tier-price { font-size: 2.4rem; font-weight: 900; color: #fff; margin-bottom: 4px; }
    .tier-price span { font-size: 0.85rem; font-weight: 400; color: #666; }
    .tier-desc { color: #666; font-size: 0.82rem; margin: 16px 0; line-height: 1.5; }
    .tier-features { list-style: none; margin: 0 0 24px; text-align: left; }
    .tier-features li { font-size: 0.82rem; color: #aaa; padding: 6px 0; border-bottom: 1px solid #2e2e2e; display: flex; gap: 8px; }
    .tier-features li::before { content: "✓"; color: #cc0000; font-weight: 900; flex-shrink: 0; }
    .tier-features li.na { color: #444; }
    .tier-features li.na::before { content: "–"; color: #444; }

    /* CTA band */
    .cta-band {
      background: #cc0000; padding: 70px 20px; text-align: center;
    }
    .cta-band h2 {
      font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 900;
      text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px;
    }
    .cta-band p { color: rgba(255,255,255,0.8); margin-bottom: 30px; font-size: 1rem; }
    .btn-white { background: #fff; color: #cc0000; }
    .btn-white:hover { background: #f0f0f0; }

    /* Footer */
    footer {
      background: #111; border-top: 1px solid #222;
      padding: 40px 20px; text-align: center;
    }
    footer .footer-logo { font-size: 0.9rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #555; margin-bottom: 14px; }
    footer .footer-logo span { color: #cc0000; }
    footer nav { display: flex; justify-content: center; gap: 24px; margin-bottom: 20px; border: none; background: none; position: static; padding: 0; }
    footer nav a { color: #555; font-size: 0.78rem; text-decoration: none; letter-spacing: 1px; text-transform: uppercase; }
    footer nav a:hover { color: #888; }
    footer p { color: #444; font-size: 0.75rem; }

    ${flash ? `
    .flash { background: #1f2a1f; border-left: 3px solid #4a4; color: #8d8; padding: 12px 20px; text-align: center; font-size: 0.85rem; }
    .flash.error { background: #2a1f1f; border-left-color: #a44; color: #d88; }
    ` : ""}
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

${flash ? `<div class="flash ${flash.type === "error" ? "error" : ""}">${flash.msg}</div>` : ""}

<!-- Hero -->
<div class="hero">
  <div class="hero-tag">Live Fixture Feeds</div>
  <h1>Keep Your Fans <span>In The Loop</span> — Automatically</h1>
  <p>Add your fixtures once. Fans subscribe to your calendar and every reschedule, cancellation and change updates instantly in Google, Apple and Outlook.</p>
  <div class="hero-actions">
    <a href="/signup" class="btn btn-primary">🚀 Get Started Free</a>
    <a href="/pricing" class="btn btn-outline">View Plans</a>
  </div>
</div>

<hr class="divider">

<!-- How it works -->
<div class="section">
  <div class="section-label">How It Works</div>
  <h2>Up and Running in Minutes</h2>
  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <h3>Sign Up Your Club</h3>
      <p>Create your free account, give your club a name and you get a public fixtures page and calendar feed instantly.</p>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <h3>Add Your Fixtures</h3>
      <p>Add games one by one or bulk import from a spreadsheet. Set home/away, venue and competition details.</p>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <h3>Fans Subscribe</h3>
      <p>Share your public page link. Fans subscribe to your calendar once and every update reaches them automatically.</p>
    </div>
  </div>
</div>

<hr class="divider">

<!-- Features -->
<div class="section" style="padding-top:70px;padding-bottom:70px">
  <div class="section-label">Features</div>
  <h2>Everything Your Club Needs</h2>
  <div class="features">
    <div class="feature">
      <div class="feature-icon">📅</div>
      <h4>Live Calendar Feed</h4>
      <p>Standard ICS feed — works with Google Calendar, Apple Calendar, Outlook and any other calendar app.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">🔄</div>
      <h4>Instant Updates</h4>
      <p>Reschedule a fixture and every subscribed calendar refreshes automatically. No messages needed.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">🌐</div>
      <h4>Public Fixtures Page</h4>
      <p>Your club gets a clean, shareable webpage showing upcoming and past fixtures.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">✉️</div>
      <h4>Email Notifications</h4>
      <p>Automatically email your subscriber list whenever a fixture is rescheduled.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">📤</div>
      <h4>Bulk Import</h4>
      <p>Upload a whole season's fixtures from Excel or CSV in seconds using our template.</p>
    </div>
    <div class="feature">
      <div class="feature-icon">❌</div>
      <h4>Cancellations</h4>
      <p>Cancel a fixture and it automatically disappears from subscribed calendars — or stays shown as cancelled.</p>
    </div>
  </div>
</div>

<hr class="divider">

<!-- Tier preview -->
<div class="section">
  <div class="section-label">Plans</div>
  <h2>Simple, Transparent Pricing</h2>
  <div class="tiers">

    <div class="tier">
      <div class="tier-name">Free</div>
      <div class="tier-price">£0 <span>/ month</span></div>
      <div class="tier-desc">Perfect for getting started.</div>
      <ul class="tier-features">
        <li>Public fixtures page</li>
        <li>Unlimited fixtures</li>
        <li>Dashboard access</li>
        <li>CSV / Excel import</li>
        <li class="na">Calendar subscription feed</li>
        <li class="na">Email notifications</li>
      </ul>
      <a href="/signup" class="btn btn-outline" style="width:100%;justify-content:center">Get Started</a>
    </div>

    <div class="tier featured">
      <div class="tier-badge">Most Popular</div>
      <div class="tier-name">Standard</div>
      <div class="tier-price">TBC <span>/ month</span></div>
      <div class="tier-desc">For clubs that want live calendar feeds.</div>
      <ul class="tier-features">
        <li>Everything in Free</li>
        <li>Live ICS calendar feed</li>
        <li>Calendar subscribe button</li>
        <li>Email notifications</li>
        <li class="na">Priority support</li>
      </ul>
      <a href="/pricing" class="btn btn-primary" style="width:100%;justify-content:center">View Pricing</a>
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
      <a href="/pricing" class="btn btn-outline" style="width:100%;justify-content:center">View Pricing</a>
    </div>

  </div>
  <p style="text-align:center;margin-top:24px;color:#555;font-size:0.82rem">
    <a href="/pricing" style="color:#cc0000;text-decoration:none">View full pricing details →</a>
  </p>
</div>

<!-- CTA band -->
<div class="cta-band">
  <h2>Ready to Get Started?</h2>
  <p>Set up your club in minutes — no credit card required.</p>
  <a href="/signup" class="btn btn-white">Create Free Account</a>
</div>

<footer>
  <div class="footer-logo">Fixture<span>App</span></div>
  <nav>
    <a href="/pricing">Pricing</a>
    <a href="/signup">Sign Up</a>
    <a href="/dashboard/login">Login</a>
  </nav>
  <p>© ${new Date().getFullYear()} FixtureApp. Built for sports clubs.</p>
</footer>

</body>
</html>`;
}

module.exports = { homepagePage };
