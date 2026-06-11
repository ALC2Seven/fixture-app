const { layout } = require("./layout");

function playersPage(user, team, players, squads, flash) {
  const content = `
    ${flash ? `<div class="alert alert-${flash.type}">${flash.msg}</div>` : ""}

    <div class="page-header">
      <h1>Players</h1>
      <p>Your club roster — used for picking match line-ups.</p>
    </div>

    <div class="card">
      <div class="card-title">Add Player</div>
      <form method="POST" action="/dashboard/players/add">
        <div class="form-row" style="align-items:flex-end">
          <div class="form-group" style="flex:2">
            <label>Name</label>
            <input type="text" name="name" required maxlength="100" placeholder="e.g. Alfie Smith">
          </div>
          ${squads.length ? `
          <div class="form-group">
            <label>Squad</label>
            <select name="squadId">
              <option value="">Unassigned</option>
              ${squads.map(s => `<option value="${s.id}">${s.name}</option>`).join("")}
            </select>
          </div>` : ""}
          <div class="form-group" style="flex:0">
            <button type="submit" class="btn btn-primary">Add Player</button>
          </div>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-title">Roster (${players.length})</div>
      ${players.length ? `
      <table>
        <thead><tr><th>Name</th>${squads.length ? "<th>Squad</th>" : ""}<th></th></tr></thead>
        <tbody>${players.map(p => `
          <tr>
            <td><strong>${p.name}</strong></td>
            ${squads.length ? `<td style="color:#60a5fa;font-size:0.8rem;font-weight:700">${p.squad_name || '<span style="color:var(--text-5)">Unassigned</span>'}</td>` : ""}
            <td>
              <form method="POST" action="/dashboard/players/remove" onsubmit="return confirm('Remove ${p.name.replace(/'/g, "\\'")} from the roster? They will be removed from any line-ups.')">
                <input type="hidden" name="playerId" value="${p.id}">
                <button class="btn btn-sm" style="background:rgba(224,40,40,0.12);color:#f87171;border:1px solid rgba(224,40,40,0.3)">Remove</button>
              </form>
            </td>
          </tr>`).join("")}
        </tbody>
      </table>` : `<p style="color:var(--text-4);font-size:0.85rem">No players yet — add your roster above, then pick line-ups from the Fixtures page.</p>`}
    </div>
  `;
  return layout("Players", content, user);
}

module.exports = { playersPage };
