const { layout } = require("./layout");

function lineupPage(user, fixture, players, selectedIds, flash) {
  const when = new Date(fixture.start_time).toLocaleDateString("en-GB",
    { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

  const content = `
    ${flash ? `<div class="alert alert-${flash.type}">${flash.msg}</div>` : ""}

    <div class="page-header">
      <h1>Line-up</h1>
      <p>${fixture.summary} — ${when}${fixture.squad_name ? ` · ${fixture.squad_name}` : ""}</p>
    </div>

    <a href="/dashboard" class="btn btn-secondary btn-sm" style="margin-bottom:16px">← Back to Fixtures</a>

    <div class="card">
      <div class="card-title">Select Players (<span id="lineup-count">${selectedIds.size}</span> selected)</div>
      ${players.length ? `
      <form method="POST" action="/dashboard/lineup/${fixture.uid}">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:20px">
          ${players.map(p => `
          <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--row-hover);border:1px solid var(--border);border-radius:10px;cursor:pointer">
            <input type="checkbox" name="playerIds" value="${p.id}" ${selectedIds.has(p.id) ? "checked" : ""}
              style="width:auto;accent-color:#e02828" onchange="updateCount()">
            <span>
              <span style="font-weight:700;font-size:0.88rem">${p.name}</span>
              ${p.squad_name ? `<span style="display:block;color:#60a5fa;font-size:0.7rem;font-weight:700">${p.squad_name}</span>` : ""}
            </span>
          </label>`).join("")}
        </div>
        <button type="submit" class="btn btn-primary">Save Line-up</button>
      </form>
      <script>
        function updateCount() {
          document.getElementById('lineup-count').textContent =
            document.querySelectorAll('input[name="playerIds"]:checked').length;
        }
      </script>
      ` : `<p style="color:var(--text-4);font-size:0.85rem">
        No players available${fixture.squad_name ? ` for ${fixture.squad_name}` : ""} —
        <a href="/dashboard/players" style="color:var(--red)">add players to your roster</a> first.</p>`}
    </div>
  `;
  return layout("Line-up", content, user);
}

module.exports = { lineupPage };
