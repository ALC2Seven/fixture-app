const { layout } = require("./layout");

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC"
  });
}

function homePage(user, team, fixtures, subscribers, flash) {
  const now = new Date();
  const upcoming = fixtures.filter(f => new Date(f.start_time) >= now);
  const past     = fixtures.filter(f => new Date(f.start_time) <  now);

  const fixtureRows = fixtures.map(f => `
    <tr>
      <td>${fmtDate(f.start_time)}</td>
      <td><strong>${f.home_team || f.summary}</strong></td>
      <td style="color:#cc0000;font-weight:900">VS</td>
      <td><strong>${f.away_team || ""}</strong></td>
      <td style="color:#888">${f.location || "TBC"}</td>
      <td>${f.is_home ? '<span class="badge badge-standard">Home</span>' : '<span class="badge badge-free">Away</span>'}</td>
      <td>
        <button onclick="openReschedule('${f.uid}','${f.summary}','${f.start_time}','${f.end_time}')"
          class="btn btn-secondary btn-sm">Reschedule</button>
      </td>
    </tr>
  `).join("");

  const content = `
    ${flash ? `<div class="alert alert-${flash.type}">${flash.msg}</div>` : ""}

    <div class="page-header">
      <h1>${team.name}</h1>
      <p>Manage your fixtures and subscribers.</p>
    </div>

    <div class="stats">
      <div class="stat"><div class="stat-value">${upcoming.length}</div><div class="stat-label">Upcoming</div></div>
      <div class="stat"><div class="stat-value">${past.length}</div><div class="stat-label">Past</div></div>
      <div class="stat"><div class="stat-value">${subscribers.length}</div><div class="stat-label">Subscribers</div></div>
      <div class="stat"><div class="stat-value">${team.tier}</div><div class="stat-label">Plan</div></div>
    </div>

    <!-- Add Fixture -->
    <div class="card">
      <div class="card-title">Add Fixture</div>
      <form method="POST" action="/dashboard/fixtures/add">
        <div class="form-row">
          <div class="form-group">
            <label>Home Team</label>
            <input type="text" name="homeTeam" required placeholder="e.g. City FC">
          </div>
          <div class="form-group">
            <label>Away Team</label>
            <input type="text" name="awayTeam" required placeholder="e.g. United AFC">
          </div>
          <div class="form-group">
            <label>Playing</label>
            <select name="isHome">
              <option value="true">Home</option>
              <option value="false">Away</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Kick-off Date & Time (UTC)</label>
            <input type="datetime-local" name="start" required>
          </div>
          <div class="form-group">
            <label>End Time (UTC)</label>
            <input type="datetime-local" name="end" required>
          </div>
          <div class="form-group">
            <label>Venue</label>
            <input type="text" name="location" placeholder="e.g. Riverside Stadium">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Competition / Description</label>
            <input type="text" name="description" placeholder="e.g. Premier League — Matchday 3">
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Add Fixture</button>
      </form>
    </div>

    <!-- Fixtures Table -->
    <div class="card">
      <div class="card-title">All Fixtures (${fixtures.length})</div>
      ${fixtures.length ? `
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Home</th>
            <th></th>
            <th>Away</th>
            <th>Venue</th>
            <th>H/A</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${fixtureRows}</tbody>
      </table>` : `<p style="color:#555;font-size:0.85rem">No fixtures yet — add one above.</p>`}
    </div>

    <!-- Reschedule Modal -->
    <div id="reschedule-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:100;align-items:center;justify-content:center;">
      <div class="card" style="width:500px;max-width:90vw">
        <div class="card-title">Reschedule Fixture</div>
        <p id="reschedule-name" style="color:#fff;font-size:1rem;font-weight:700;margin-bottom:6px"></p>

        <!-- Current date display -->
        <div style="background:#111;border-left:3px solid #555;padding:8px 12px;margin-bottom:16px;font-size:0.82rem;color:#888">
          Current date: <span id="reschedule-current" style="color:#aaa;font-weight:700"></span>
        </div>

        <form method="POST" action="/dashboard/fixtures/reschedule">
          <input type="hidden" name="uid" id="reschedule-uid">
          <div class="form-row">
            <div class="form-group">
              <label>New Kick-off Date & Time (UTC)</label>
              <input type="datetime-local" name="newStart" id="reschedule-start" required>
            </div>
            <div class="form-group">
              <label>New End Time (UTC)</label>
              <input type="datetime-local" name="newEnd" id="reschedule-end" required>
            </div>
          </div>
          <p style="color:#555;font-size:0.75rem;margin:-6px 0 12px">End time updates automatically to match original match duration.</p>
          <div class="form-group" style="margin-bottom:16px">
            <label>Reason (optional)</label>
            <input type="text" name="reason" placeholder="e.g. Pitch waterlogged">
          </div>
          <div style="display:flex;gap:10px">
            <button type="submit" class="btn btn-primary">Confirm Reschedule</button>
            <button type="button" onclick="closeReschedule()" class="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <script>
      function toUtcDatetime(iso) {
        const d = new Date(iso);
        const pad = n => String(n).padStart(2,'0');
        return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())+'T'+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes());
      }
      function fmtDisplay(iso) {
        return new Date(iso).toUTCString().replace(':00 GMT','').replace(' GMT','');
      }

      let matchDurationMs = 0;

      function openReschedule(uid, name, start, end) {
        matchDurationMs = new Date(end) - new Date(start);
        document.getElementById('reschedule-uid').value = uid;
        document.getElementById('reschedule-name').textContent = name;
        document.getElementById('reschedule-current').textContent = fmtDisplay(start);
        document.getElementById('reschedule-start').value = toUtcDatetime(start);
        document.getElementById('reschedule-end').value = toUtcDatetime(end);
        document.getElementById('reschedule-modal').style.display = 'flex';
      }

      // Auto-update end time when start changes, preserving match duration
      document.getElementById('reschedule-start').addEventListener('change', function() {
        if (!this.value) return;
        const newStart = new Date(this.value + 'Z');
        const newEnd = new Date(newStart.getTime() + matchDurationMs);
        document.getElementById('reschedule-end').value = toUtcDatetime(newEnd.toISOString());
      });

      function closeReschedule() {
        document.getElementById('reschedule-modal').style.display = 'none';
      }
    </script>
  `;

  return layout(`${team.name} Dashboard`, content, user);
}

module.exports = { homePage };
