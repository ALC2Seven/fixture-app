const { fanLayout } = require("./layout");

function fanDashboardPage(fanUser, subscriptions, flash, familyMembers) {
  familyMembers = familyMembers || [];
  const rows = subscriptions.length ? subscriptions.map(s => {
    const squadSuffix = s.squad_id ? `?squad=${s.squad_id}` : "";
    const icsUrl     = `https://${s.calendar_host}/calendar/${s.team_slug}.ics${squadSuffix}`;
    const webcalUrl  = `webcal://${s.calendar_host}/calendar/${s.team_slug}.ics${squadSuffix}`;
    const googleUrl  = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
    const outlookUrl = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(icsUrl)}&name=${encodeURIComponent(s.team_name + (s.squad_name ? " " + s.squad_name : "") + " Fixtures")}`;
    return `
    <div style="padding:18px 20px;background:var(--surface-2);margin-bottom:10px;border:1px solid var(--border);border-radius:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-weight:900;font-size:0.95rem;text-transform:uppercase;letter-spacing:1px">${s.team_name}${s.squad_name ? ` <span style="color:#60a5fa;font-size:0.78rem">· ${s.squad_name}</span>` : ""}</div>
          <div style="font-size:0.75rem;color:var(--text-4);margin-top:3px">Subscribed ${new Date(s.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <a href="/${s.team_slug}" class="btn btn-secondary btn-sm">View Fixtures</a>
          <form method="POST" action="/fan/unsubscribe" style="display:inline">
            <input type="hidden" name="teamId" value="${s.team_id}">
            <button class="btn btn-sm" style="background:rgba(224,40,40,0.12);color:#f87171;border:1px solid rgba(224,40,40,0.3)">Unsubscribe</button>
          </form>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px;padding-top:12px;border-top:1px dashed var(--border-2)">
        <span style="font-size:0.68rem;color:var(--text-4);text-transform:uppercase;letter-spacing:1px;font-weight:700">Add to calendar:</span>
        <a href="${webcalUrl}" class="btn btn-secondary btn-sm">🍎 Apple</a>
        <a href="${googleUrl}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">📆 Google</a>
        <a href="${outlookUrl}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">📧 Outlook</a>
      </div>
    </div>
  `}).join("") : `<p style="color:var(--text-4);font-size:0.85rem;padding:20px 0">You haven't subscribed to any teams yet. Visit a team's fixture page to subscribe.</p>`;

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

    <div class="card">
      <div class="card-title">My Family</div>
      <p style="color:var(--text-3);font-size:0.85rem;margin-bottom:16px">
        Add the children or players you respond for. On any team page you'll get
        separate Going / Maybe / Can't buttons for each person — the coach sees who's coming by name.
      </p>
      ${familyMembers.length ? familyMembers.map(m => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
          <span style="font-weight:700;font-size:0.9rem">👤 ${m.name}</span>
          <form method="POST" action="/fan/family/remove" onsubmit="return confirm('Remove ${m.name.replace(/'/g, "\\'")}? Their availability responses will be cleared.')">
            <input type="hidden" name="memberId" value="${m.id}">
            <button class="btn btn-sm" style="background:rgba(224,40,40,0.12);color:#f87171;border:1px solid rgba(224,40,40,0.3)">Remove</button>
          </form>
        </div>
      `).join("") : ""}
      <form method="POST" action="/fan/family/add" style="display:flex;gap:10px;align-items:flex-end;margin-top:${familyMembers.length ? "14px" : "0"}">
        <div class="form-group" style="flex:1;margin-bottom:0">
          <label>Name</label>
          <input type="text" name="name" required maxlength="100" placeholder="e.g. Alfie">
        </div>
        <button type="submit" class="btn btn-primary">Add</button>
      </form>
    </div>
    <p style="color:var(--text-4);font-size:0.78rem;text-align:center">
      Your email <strong style="color:var(--text-3)">${fanUser.email}</strong> receives alerts when subscribed teams reschedule or cancel fixtures.
    </p>
  `;
  return fanLayout("My Teams", content, fanUser);
}

module.exports = { fanDashboardPage };
