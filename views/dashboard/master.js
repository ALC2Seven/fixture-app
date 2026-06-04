const { layout } = require("./layout");

function masterPage(user, teams) {
  const rows = teams.map(t => `
    <tr>
      <td><strong>${t.name}</strong></td>
      <td style="color:#888">${t.slug}</td>
      <td><span class="badge badge-${t.tier}">${t.tier}</span></td>
      <td style="color:#888">${t.fixture_count}</td>
      <td style="color:#888">${t.subscriber_count}</td>
      <td style="color:#555;font-size:0.75rem">${new Date(t.created_at).toLocaleDateString("en-GB")}</td>
      <td>
        <form method="POST" action="/dashboard/master/tier" style="display:inline-flex;gap:6px;align-items:center">
          <input type="hidden" name="slug" value="${t.slug}">
          <select name="tier" style="padding:4px 8px;font-size:0.75rem">
            <option value="free" ${t.tier==="free"?"selected":""}>Free</option>
            <option value="standard" ${t.tier==="standard"?"selected":""}>Standard</option>
            <option value="pro" ${t.tier==="pro"?"selected":""}>Pro</option>
          </select>
          <button type="submit" class="btn btn-secondary btn-sm">Update</button>
        </form>
      </td>
    </tr>
  `).join("");

  const content = `
    <div class="page-header">
      <h1>Master <span style="color:#cc0000">Dashboard</span></h1>
      <p>All teams across the platform.</p>
    </div>

    <div class="stats">
      <div class="stat"><div class="stat-value">${teams.length}</div><div class="stat-label">Total Teams</div></div>
      <div class="stat"><div class="stat-value">${teams.filter(t=>t.tier==="standard").length}</div><div class="stat-label">Standard</div></div>
      <div class="stat"><div class="stat-value">${teams.filter(t=>t.tier==="pro").length}</div><div class="stat-label">Pro</div></div>
      <div class="stat"><div class="stat-value">${teams.reduce((s,t)=>s+parseInt(t.subscriber_count),0)}</div><div class="stat-label">Total Subscribers</div></div>
    </div>

    <div class="card">
      <div class="card-title">All Teams</div>
      <table>
        <thead>
          <tr>
            <th>Team</th>
            <th>Slug</th>
            <th>Plan</th>
            <th>Fixtures</th>
            <th>Subscribers</th>
            <th>Joined</th>
            <th>Plan</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  return layout("Master Dashboard", content, user);
}

module.exports = { masterPage };
