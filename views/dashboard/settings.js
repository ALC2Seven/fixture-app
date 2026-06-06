const { layout } = require("./layout");

function settingsPage(user, team, flash) {
  const content = `
    ${flash ? `<div class="alert alert-${flash.type}">${flash.msg}</div>` : ""}

    <div class="page-header">
      <h1>Settings</h1>
      <p>Manage your club details and account.</p>
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
  `;
  return layout("Settings", content, user);
}

module.exports = { settingsPage };
