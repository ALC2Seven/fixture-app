const { layout } = require("./layout");

const ROLE_BADGES = {
  owner:   '<span class="badge" style="background:rgba(224,40,40,0.15);color:#f87171">Owner</span>',
  manager: '<span class="badge" style="background:#14203a;color:#60a5fa">Manager</span>',
  coach:   '<span class="badge" style="background:#143620;color:#4ade80">Coach</span>',
  master:  '<span class="badge" style="background:#2a1a3a;color:#c084fc">Master</span>',
};

const ROLE_DESCRIPTIONS = `
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:4px">
    <div style="font-size:0.78rem;color:var(--text-3)"><strong style="color:#f87171">Owner</strong> — full control: settings, members, messages, fixtures.</div>
    <div style="font-size:0.78rem;color:var(--text-3)"><strong style="color:#60a5fa">Manager</strong> — fixtures, events, messages and subscribers.</div>
    <div style="font-size:0.78rem;color:var(--text-3)"><strong style="color:#4ade80">Coach</strong> — fixtures, events and availability only.</div>
  </div>
`;

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function membersPage(user, team, members, invites, flash, appUrl) {
  const memberRows = members.map(m => {
    const isSelf = m.id === user.id;
    return `
    <tr>
      <td><strong>${m.email}</strong>${isSelf ? ' <span style="color:var(--text-4);font-size:0.75rem">(you)</span>' : ""}</td>
      <td>${ROLE_BADGES[m.role] || m.role}</td>
      <td style="color:var(--text-4)">${fmtDate(m.created_at)}</td>
      <td>
        ${!isSelf && m.role !== "master" ? `
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <form method="POST" action="/dashboard/members/role" style="display:flex;gap:6px;align-items:center">
            <input type="hidden" name="userId" value="${m.id}">
            <select name="role" style="width:auto;padding:5px 8px;font-size:0.75rem">
              <option value="owner" ${m.role === "owner" ? "selected" : ""}>Owner</option>
              <option value="manager" ${m.role === "manager" ? "selected" : ""}>Manager</option>
              <option value="coach" ${m.role === "coach" ? "selected" : ""}>Coach</option>
            </select>
            <button class="btn btn-secondary btn-sm">Update</button>
          </form>
          <form method="POST" action="/dashboard/members/remove" onsubmit="return confirm('Remove ${m.email} from ${team.name}?')">
            <input type="hidden" name="userId" value="${m.id}">
            <button class="btn btn-sm" style="background:rgba(224,40,40,0.12);color:#f87171;border:1px solid rgba(224,40,40,0.3)">Remove</button>
          </form>
        </div>` : ""}
      </td>
    </tr>`;
  }).join("");

  const inviteRows = invites.map(i => `
    <tr>
      <td><strong>${i.email}</strong></td>
      <td>${ROLE_BADGES[i.role] || i.role}</td>
      <td style="color:var(--text-4)">${fmtDate(i.created_at)}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <input type="text" readonly value="${appUrl}/invite/${i.token}" onclick="this.select()"
            style="width:220px;font-size:0.72rem;padding:5px 8px;color:var(--text-3)">
          <button type="button" class="btn btn-secondary btn-sm"
            onclick="navigator.clipboard.writeText('${appUrl}/invite/${i.token}').then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy link',2000)})">Copy link</button>
          <form method="POST" action="/dashboard/members/cancel-invite">
            <input type="hidden" name="inviteId" value="${i.id}">
            <button class="btn btn-secondary btn-sm">Cancel</button>
          </form>
        </div>
      </td>
    </tr>
  `).join("");

  const content = `
    ${flash ? `<div class="alert alert-${flash.type}">${flash.msg}</div>` : ""}

    <div class="page-header">
      <h1>Team Members</h1>
      <p>Share the workload — invite other volunteers to help run ${team.name}.</p>
    </div>

    <div class="card">
      <div class="card-title">Roles</div>
      ${ROLE_DESCRIPTIONS}
    </div>

    <div class="card">
      <div class="card-title">Invite Someone</div>
      <form method="POST" action="/dashboard/members/invite">
        <div class="form-row" style="align-items:flex-end">
          <div class="form-group" style="flex:2">
            <label>Email</label>
            <input type="email" name="email" required placeholder="volunteer@example.com">
          </div>
          <div class="form-group">
            <label>Role</label>
            <select name="role">
              <option value="coach">Coach</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div class="form-group" style="flex:0">
            <button type="submit" class="btn btn-primary">Send Invite</button>
          </div>
        </div>
      </form>
      <p style="color:var(--text-4);font-size:0.78rem;margin-top:8px">
        They'll get an email with a link to set their password — or copy the link from the pending list below and send it yourself.
      </p>
    </div>

    ${invites.length ? `
    <div class="card">
      <div class="card-title">Pending Invites (${invites.length})</div>
      <table>
        <thead><tr><th>Email</th><th>Role</th><th>Invited</th><th>Invite Link</th></tr></thead>
        <tbody>${inviteRows}</tbody>
      </table>
    </div>` : ""}

    <div class="card">
      <div class="card-title">Members (${members.length})</div>
      <table>
        <thead><tr><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
        <tbody>${memberRows}</tbody>
      </table>
    </div>
  `;

  return layout("Team Members", content, user);
}

module.exports = { membersPage };
