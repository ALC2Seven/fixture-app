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

  const fixtureRows = fixtures.map(f => {
    const cancelled = f.status === "cancelled_hidden" || f.status === "cancelled_shown";
    const rowStyle = cancelled ? "opacity:0.5" : "";
    const statusBadge = f.status === "cancelled_shown"
      ? '<span class="badge" style="background:#2a1010;color:#ff6666">CANCELLED</span>'
      : f.status === "cancelled_hidden"
      ? '<span class="badge" style="background:#222;color:#555">HIDDEN</span>'
      : "";
    // Derive home/away from actual team name positions, not the is_home flag
    const isActuallyHome = f.home_team === team.name;
    const opponentName   = isActuallyHome ? f.away_team : f.home_team;
    return `
    <tr style="${rowStyle}">
      <td>${fmtDate(f.start_time)} ${statusBadge}</td>
      <td><strong>${f.home_team || f.summary}</strong></td>
      <td style="color:#cc0000;font-weight:900">VS</td>
      <td><strong>${f.away_team || ""}</strong></td>
      <td style="color:#888">${f.location || "TBC"}</td>
      <td>${isActuallyHome ? '<span class="badge badge-standard">Home</span>' : '<span class="badge badge-free">Away</span>'}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        ${!cancelled ? `
          <button onclick="openReschedule('${f.uid}','${f.summary}','${f.start_time}','${f.end_time}')"
            class="btn btn-secondary btn-sm">Reschedule</button>
          <button onclick="openEdit('${f.uid}','${opponentName.replace(/'/g,"\\'")}','${isActuallyHome}','${(f.location||'').replace(/'/g,"\\'")}','${(f.description||'').replace(/'/g,"\\'")}')"
            class="btn btn-secondary btn-sm">Edit</button>
          <button onclick="openCancel('${f.uid}','${f.summary}')"
            class="btn btn-sm" style="background:#2a1010;color:#ff6666">Cancel</button>
        ` : `
          <form method="POST" action="/dashboard/fixtures/restore">
            <input type="hidden" name="uid" value="${f.uid}">
            <button class="btn btn-secondary btn-sm">Restore</button>
          </form>
        `}
      </td>
    </tr>
  `}).join("");

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
      <div class="stat"><div class="stat-value" style="text-transform:capitalize">${team.tier}</div><div class="stat-label">Plan</div></div>
    </div>

    <!-- Plan Management -->
    <div class="card">
      <div class="card-title">Your Plan</div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
        <div>
          <div style="font-size:1.1rem;font-weight:900;text-transform:uppercase;letter-spacing:2px">${team.tier}</div>
          <div style="color:#666;font-size:0.82rem;margin-top:4px">
            ${team.tier === 'free'
              ? 'Public fixtures page only. Upgrade to Standard to unlock calendar feeds and email notifications.'
              : team.tier === 'standard'
              ? 'Live calendar feed + email notifications included.'
              : 'Full Pro access — all features included.'}
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${team.tier === 'free'
            ? `<a href="/pricing" class="btn btn-primary">Upgrade Plan</a>`
            : team.tier === 'standard'
            ? `<a href="/pricing" class="btn btn-primary">Upgrade to Pro</a>
               <a href="/pricing" class="btn btn-secondary">View Plans</a>`
            : `<a href="/pricing" class="btn btn-secondary">View Plans</a>`}
        </div>
      </div>
    </div>

    <!-- Import Fixtures -->
    <div class="card">
      <div class="card-title">Import Fixtures from File</div>
      <p style="color:#888;font-size:0.82rem;margin-bottom:14px">Upload an Excel or CSV file to add multiple fixtures at once. Download the template to get started.</p>
      <form method="POST" action="/dashboard/fixtures/upload" enctype="multipart/form-data"
            style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <a href="/dashboard/fixtures/template" class="btn btn-secondary">⬇ Download Template</a>
        <input type="file" name="file" accept=".xlsx,.csv" required
          style="background:#111;border:1px solid #333;color:#aaa;padding:8px 12px;font-size:0.82rem;cursor:pointer;flex:1;min-width:160px">
        <button type="submit" class="btn btn-primary">Upload & Import</button>
      </form>
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
          <input type="hidden" name="newStart" id="reschedule-start">
          <input type="hidden" name="newEnd" id="reschedule-end">
          <div class="form-row">
            <div class="form-group" style="flex:1 1 100%">
              <label>New Date</label>
              <input type="date" id="reschedule-date" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Kick-off Time (UTC)</label>
              <input type="time" id="reschedule-starttime" required>
            </div>
            <div class="form-group">
              <label>End Time (UTC)</label>
              <input type="time" id="reschedule-endtime" required>
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
        const s = new Date(start);
        const e = new Date(end);
        const pad = n => String(n).padStart(2,'0');

        document.getElementById('reschedule-uid').value = uid;
        document.getElementById('reschedule-name').textContent = name;
        document.getElementById('reschedule-current').textContent = fmtDisplay(start);

        // Populate the three separate fields
        document.getElementById('reschedule-date').value =
          s.getUTCFullYear()+'-'+pad(s.getUTCMonth()+1)+'-'+pad(s.getUTCDate());
        document.getElementById('reschedule-starttime').value =
          pad(s.getUTCHours())+':'+pad(s.getUTCMinutes());
        document.getElementById('reschedule-endtime').value =
          pad(e.getUTCHours())+':'+pad(e.getUTCMinutes());

        updateHiddenFields();
        document.getElementById('reschedule-modal').style.display = 'flex';
      }

      function updateHiddenFields() {
        const date = document.getElementById('reschedule-date').value;
        const startTime = document.getElementById('reschedule-starttime').value;
        const endTime = document.getElementById('reschedule-endtime').value;
        if (date && startTime) document.getElementById('reschedule-start').value = date + 'T' + startTime + ':00Z';
        if (date && endTime)   document.getElementById('reschedule-end').value   = date + 'T' + endTime   + ':00Z';
      }

      // Auto-update end time when kick-off changes, preserving match duration
      document.getElementById('reschedule-starttime').addEventListener('change', function() {
        const date = document.getElementById('reschedule-date').value;
        if (!date || !this.value) return;
        const newStart = new Date(date + 'T' + this.value + ':00Z');
        const newEnd = new Date(newStart.getTime() + matchDurationMs);
        const pad = n => String(n).padStart(2,'0');
        document.getElementById('reschedule-endtime').value =
          pad(newEnd.getUTCHours())+':'+pad(newEnd.getUTCMinutes());
        updateHiddenFields();
      });

      ['reschedule-date','reschedule-endtime'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateHiddenFields);
      });

      function closeReschedule() {
        document.getElementById('reschedule-modal').style.display = 'none';
      }

      // Combined edit modal
      function openEdit(uid, opponent, isHome, location, description) {
        document.getElementById('edit-uid').value = uid;
        document.getElementById('edit-opponent').value = opponent;
        document.getElementById('edit-ishome').value = String(isHome) === 'true' ? 'true' : 'false';
        // Set the select to match current home/away
        const sel = document.getElementById('edit-ishome');
        sel.value = String(isHome) === 'true' ? 'true' : 'false';
        document.getElementById('edit-location').value = location;
        document.getElementById('edit-description').value = description;
        document.getElementById('edit-modal').style.display = 'flex';
      }
      function closeEdit() {
        document.getElementById('edit-modal').style.display = 'none';
      }

      // Cancel modal
      function openCancel(uid, name) {
        document.getElementById('cancel-uid').value = uid;
        document.getElementById('cancel-name').textContent = name;
        document.getElementById('cancel-modal').style.display = 'flex';
      }
      function closeCancel() {
        document.getElementById('cancel-modal').style.display = 'none';
      }
    </script>

    <!-- Edit Fixture Modal -->
    <div id="edit-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:100;align-items:center;justify-content:center;">
      <div class="card" style="width:500px;max-width:90vw">
        <div class="card-title">Edit Fixture</div>
        <form method="POST" action="/dashboard/fixtures/edit">
          <input type="hidden" name="uid" id="edit-uid">
          <div class="form-row">
            <div class="form-group" style="flex:1">
              <label>Opponent</label>
              <input type="text" name="opponent" id="edit-opponent" required placeholder="e.g. Riverside Rovers">
            </div>
            <div class="form-group">
              <label>Playing</label>
              <select name="isHome" id="edit-ishome">
                <option value="true">Home</option>
                <option value="false">Away</option>
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-bottom:14px">
            <label>Venue</label>
            <input type="text" name="location" id="edit-location" placeholder="e.g. Riverside Stadium">
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label>Competition / Description</label>
            <input type="text" name="description" id="edit-description" placeholder="e.g. Premier League — Matchday 3">
          </div>
          <div style="display:flex;gap:10px">
            <button type="submit" class="btn btn-primary">Save Changes</button>
            <button type="button" onclick="closeEdit()" class="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Cancel Fixture Modal -->
    <div id="cancel-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:100;align-items:center;justify-content:center;">
      <div class="card" style="width:460px;max-width:90vw">
        <div class="card-title" style="color:#ff6666">Cancel Fixture</div>
        <p id="cancel-name" style="color:#fff;font-size:1rem;font-weight:700;margin-bottom:16px"></p>
        <p style="color:#aaa;font-size:0.85rem;margin-bottom:20px">How would you like to handle this cancellation?</p>
        <form method="POST" action="/dashboard/fixtures/cancel">
          <input type="hidden" name="uid" id="cancel-uid">
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
            <label style="display:flex;align-items:flex-start;gap:12px;background:#1f1f1f;padding:14px;cursor:pointer;border:1px solid #333">
              <input type="radio" name="cancelType" value="shown" checked style="margin-top:3px;width:auto">
              <div>
                <div style="font-weight:700;font-size:0.85rem">Show as Cancelled</div>
                <div style="color:#666;font-size:0.78rem;margin-top:3px">Fixture stays on the public page marked as CANCELLED. Calendar shows it as cancelled.</div>
              </div>
            </label>
            <label style="display:flex;align-items:flex-start;gap:12px;background:#1f1f1f;padding:14px;cursor:pointer;border:1px solid #333">
              <input type="radio" name="cancelType" value="hidden" style="margin-top:3px;width:auto">
              <div>
                <div style="font-weight:700;font-size:0.85rem">Remove Completely</div>
                <div style="color:#666;font-size:0.78rem;margin-top:3px">Hidden from public page. Removed from subscribed calendars automatically.</div>
              </div>
            </label>
          </div>
          <div style="display:flex;gap:10px">
            <button type="submit" class="btn btn-sm" style="background:#cc0000;color:#fff">Confirm Cancellation</button>
            <button type="button" onclick="closeCancel()" class="btn btn-secondary">Keep Fixture</button>
          </div>
        </form>
      </div>
    </div>
  `;

  return layout(`${team.name} Dashboard`, content, user);
}

module.exports = { homePage };
