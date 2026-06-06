const { fanLayout } = require("./layout");

function fanDashboardPage(fanUser, subscriptions, flash) {
  const rows = subscriptions.length ? subscriptions.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;
                padding:16px 20px;background:#2a2a2a;margin-bottom:2px;border-left:3px solid #333;">
      <div>
        <div style="font-weight:900;font-size:0.95rem;text-transform:uppercase;letter-spacing:1px">${s.team_name}</div>
        <div style="font-size:0.75rem;color:#666;margin-top:3px">Subscribed ${new Date(s.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <a href="/${s.team_slug}" class="btn btn-secondary btn-sm">View Fixtures</a>
        <a href="webcal://${s.calendar_host}/calendar/${s.team_slug}.ics" class="btn btn-secondary btn-sm">📅 Add to Calendar</a>
        <form method="POST" action="/fan/unsubscribe" style="display:inline">
          <input type="hidden" name="teamId" value="${s.team_id}">
          <button class="btn btn-sm" style="background:#2a1010;color:#ff6666;border:1px solid #3a1515">Unsubscribe</button>
        </form>
      </div>
    </div>
  `).join("") : `<p style="color:#555;font-size:0.85rem;padding:20px 0">You haven't subscribed to any teams yet. Visit a team's fixture page to subscribe.</p>`;

  const content = `
    ${flash ? `<div class="alert alert-${flash.type}">${flash.msg}</div>` : ""}
    <div class="page-header">
      <h1>My Teams</h1>
      <p>Manage your fixture subscriptions.</p>
    </div>
    <div class="card">
      <div class="card-title">Your Subscriptions (${subscriptions.length})</div>
      ${rows}
    </div>
    <p style="color:#555;font-size:0.78rem;text-align:center">
      Your email <strong style="color:#888">${fanUser.email}</strong> receives alerts when subscribed teams reschedule or cancel fixtures.
    </p>
  `;
  return fanLayout("My Teams", content, fanUser);
}

module.exports = { fanDashboardPage };
