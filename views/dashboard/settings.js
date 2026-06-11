const { layout } = require("./layout");

function settingsPage(user, team, flash, squads) {
  squads = squads || [];
  const isOwner = ["owner", "master"].includes(user.role);
  const content = `
    ${flash ? `<div class="alert alert-${flash.type}">${flash.msg}</div>` : ""}

    <div class="page-header">
      <h1>Settings</h1>
      <p>${isOwner ? "Manage your club details and account." : "Manage your account. Club settings are managed by the club owner."}</p>
    </div>

    ${isOwner ? `
    <!-- Club Logo -->
    <div class="card">
      <div class="card-title">Club Logo</div>
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
        ${team.logo_mime ? `
        <img src="/logo/${team.slug}?v=${new Date(team.logo_updated_at || Date.now()).getTime()}" alt="${team.name} logo"
          style="width:72px;height:72px;object-fit:contain;border-radius:14px;background:var(--row-hover);border:1px solid var(--border);padding:6px">
        ` : `
        <div style="width:72px;height:72px;border-radius:14px;background:var(--row-hover);border:1px dashed var(--border2);display:flex;align-items:center;justify-content:center;color:var(--text-5);font-size:1.6rem">🛡️</div>
        `}
        <div style="flex:1;min-width:240px">
          <form method="POST" action="/dashboard/settings/logo" enctype="multipart/form-data"
                style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" required
              style="background:var(--input-bg);border:1px solid var(--border2);color:var(--text-3);padding:8px 12px;font-size:0.82rem;cursor:pointer;flex:1;min-width:160px;border-radius:8px">
            <button type="submit" class="btn btn-primary">Upload</button>
          </form>
          <p style="color:var(--text-4);font-size:0.75rem;margin-top:8px">
            PNG, JPG or WebP, up to 1MB. Square images look best — shown on your public page, dashboard and supporter pages.
          </p>
          ${team.logo_mime ? `
          <form method="POST" action="/dashboard/settings/logo/remove" style="margin-top:4px">
            <button class="btn btn-sm" style="background:none;color:var(--text-4);border:1px solid var(--border2)">Remove logo</button>
          </form>` : ""}
        </div>
      </div>
    </div>

    <!-- Club Details -->
    <div class="card">
      <div class="card-title">Club Details</div>
      <form method="POST" action="/dashboard/settings/club">
        <div class="form-row">
          <div class="form-group">
            <label>Club Name</label>
            <input type="text" name="clubName" value="${team.name}" required placeholder="e.g. City FC">
          </div>
          <div class="form-group">
            <label>Your Page URL</label>
            <input type="text" value="${team.slug}" disabled style="color:#555;cursor:not-allowed"
              title="Your URL slug cannot be changed">
            <span style="font-size:0.72rem;color:#444;margin-top:4px">URL cannot be changed after signup.</span>
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Save Club Name</button>
      </form>
    </div>

    <!-- Home Venue -->
    <div class="card">
      <div class="card-title">Home Ground</div>
      <form method="POST" action="/dashboard/settings/home-venue">
        <div class="form-group" style="margin-bottom:14px">
          <label>Venue Name</label>
          <input type="text" name="homeVenue" value="${team.home_venue || ''}"
            placeholder="e.g. Riverside Stadium, Manchester">
        </div>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:16px;font-size:0.82rem;text-transform:none;letter-spacing:0;color:#aaa">
          <input type="checkbox" name="applyToAll" value="1" style="width:auto;accent-color:#cc0000">
          Apply this venue to all existing home fixtures
        </label>
        <p style="color:#555;font-size:0.75rem;margin-top:-10px;margin-bottom:14px">
          If unchecked, only new home fixtures will auto-fill with this venue.
        </p>
        <button type="submit" class="btn btn-primary">Save Home Ground</button>
      </form>
    </div>

    <!-- Squads -->
    <div class="card">
      <div class="card-title">Squads</div>
      <p style="color:var(--text-4);font-size:0.78rem;margin-bottom:16px">
        Run more than one team? Add squads (e.g. U10s, U12s, First Team) — fixtures can be assigned
        to a squad, supporters can follow just their squad, and each squad gets its own calendar feed.
      </p>
      ${squads.length ? squads.map(sq => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:var(--row-hover);border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
          <span><strong>${sq.name}</strong>
            <span style="color:var(--text-4);font-size:0.75rem;margin-left:8px">${sq.fixture_count} fixture${sq.fixture_count === 1 ? "" : "s"}</span>
          </span>
          <form method="POST" action="/dashboard/settings/squads/delete"
                onsubmit="return confirm('Remove ${sq.name}? Its fixtures become club-wide and its followers will follow the whole club.')">
            <input type="hidden" name="squadId" value="${sq.id}">
            <button class="btn btn-sm" style="background:rgba(224,40,40,0.12);color:#f87171;border:1px solid rgba(224,40,40,0.3)">Remove</button>
          </form>
        </div>
      `).join("") : ""}
      <form method="POST" action="/dashboard/settings/squads/add" style="display:flex;gap:10px;align-items:flex-end;margin-top:${squads.length ? "14px" : "0"}">
        <div class="form-group" style="flex:1">
          <label>Squad Name</label>
          <input type="text" name="name" required maxlength="100" placeholder="e.g. U12s">
        </div>
        <button type="submit" class="btn btn-primary">Add Squad</button>
      </form>
    </div>

    <!-- Line-up visibility -->
    <div class="card">
      <div class="card-title">Public Line-Ups</div>
      <form method="POST" action="/dashboard/settings/lineups">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:10px;font-size:0.85rem;text-transform:none;letter-spacing:0;color:var(--text-2)">
          <input type="checkbox" name="showLineups" value="1" ${team.show_lineups ? "checked" : ""} style="width:auto;accent-color:#e02828">
          Show match line-ups on the public fixtures page
        </label>
        <p style="color:var(--text-4);font-size:0.75rem;margin-bottom:14px">
          Off by default for safeguarding — player names stay private to your dashboard unless you turn this on.
        </p>
        <button type="submit" class="btn btn-primary">Save</button>
      </form>
    </div>
    ` : ""}

    <!-- Account -->
    <div class="card">
      <div class="card-title">Account</div>
      <form method="POST" action="/dashboard/settings/email">
        <div class="form-group" style="margin-bottom:14px">
          <label>Email Address</label>
          <input type="email" name="email" value="${user.email}" required>
        </div>
        <button type="submit" class="btn btn-primary">Update Email</button>
      </form>
    </div>

    ${isOwner ? `
    <!-- Theme -->
    <div class="card">
      <div class="card-title">Appearance</div>
      <p style="color:var(--text-4);font-size:0.78rem;margin-bottom:16px">Applies to both your dashboard and your public fixture page.</p>
      <form method="POST" action="/dashboard/settings/theme">
        <div class="theme-options" style="margin-bottom:16px">
          <label class="theme-opt ${team.theme !== 'dark' ? 'selected' : ''}" onclick="selectTheme('light')">
            <div class="theme-swatch" style="background:#f0f2f5;border-color:#d1d5db"></div>
            <div>
              <div class="theme-label">Light</div>
              <div class="theme-sub">Default — clean and crisp</div>
            </div>
          </label>
          <label class="theme-opt ${team.theme === 'dark' ? 'selected' : ''}" onclick="selectTheme('dark')">
            <div class="theme-swatch" style="background:#0c111d;border-color:#2a3145"></div>
            <div>
              <div class="theme-label">Dark</div>
              <div class="theme-sub">Deep navy</div>
            </div>
          </label>
        </div>
        <input type="hidden" name="theme" id="themeInput" value="${team.theme === 'dark' ? 'dark' : 'light'}">
        <button type="submit" class="btn btn-primary">Save Appearance</button>
      </form>
    </div>

    <!-- Social Media -->
    <div class="card">
      <div class="card-title">Social Media</div>
      <p style="color:#555;font-size:0.78rem;margin-bottom:16px">Links appear on your public fixture page under the Subscribe button. Leave blank to hide.</p>
      <form method="POST" action="/dashboard/settings/social">
        <div class="form-row">
          <div class="form-group">
            <label>Facebook URL</label>
            <input type="url" name="facebookUrl" value="${team.facebook_url || ''}"
              placeholder="https://facebook.com/yourclub">
          </div>
          <div class="form-group">
            <label>Instagram URL</label>
            <input type="url" name="instagramUrl" value="${team.instagram_url || ''}"
              placeholder="https://instagram.com/yourclub">
          </div>
          <div class="form-group">
            <label>TikTok URL</label>
            <input type="url" name="tiktokUrl" value="${team.tiktok_url || ''}"
              placeholder="https://tiktok.com/@yourclub">
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Save Social Links</button>
      </form>
    </div>
    ` : ""}

    <!-- Change Password -->
    <div class="card">
      <div class="card-title">Change Password</div>
      <form method="POST" action="/dashboard/settings/password">
        <div class="form-row">
          <div class="form-group">
            <label>Current Password</label>
            <input type="password" name="currentPassword" required placeholder="Your current password">
          </div>
          <div class="form-group">
            <label>New Password</label>
            <input type="password" name="newPassword" required placeholder="At least 8 characters" minlength="8">
          </div>
          <div class="form-group">
            <label>Confirm New Password</label>
            <input type="password" name="confirmPassword" required placeholder="Repeat new password">
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Change Password</button>
      </form>
    </div>
  <script>
    function selectTheme(val) {
      document.getElementById('themeInput').value = val;
      document.querySelectorAll('.theme-opt').forEach(el => el.classList.remove('selected'));
      event.currentTarget.classList.add('selected');
    }
  </script>
  `;
  return layout("Settings", content, user);
}

module.exports = { settingsPage };
