const { layout } = require("./layout");

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC"
  });
}

function homePage(user, team, fixtures, subscribers, flash, homeVenue, availability) {
  availability = availability || {};
  const now = new Date();
  const upcoming = fixtures.filter(f => new Date(f.start_time) >= now);
  const past     = fixtures.filter(f => new Date(f.start_time) <  now);

  const TYPE_BADGES = {
    league:     '<span class="badge" style="background:#1a1a2a;color:#5c9aff">League</span>',
    cup:        '<span class="badge" style="background:#2a2000;color:#f0b429">Cup</span>',
    tournament: '<span class="badge" style="background:#001a2a;color:#29b6f0">Tournament</span>',
    festival:   '<span class="badge" style="background:#0a1a0a;color:#66bb6a">Festival</span>',
  };
  const KIND_BADGES = {
    training: '<span class="badge" style="background:#1f1530;color:#b794f6">Training</span>',
    meeting:  '<span class="badge" style="background:#1a2530;color:#7ab8d9">Meeting</span>',
    social:   '<span class="badge" style="background:#2a1520;color:#f687b3">Social</span>',
    duty:     '<span class="badge" style="background:#0a2025;color:#4fd1c5">Duty</span>',
  };

  const fixtureRows = fixtures.map(f => {
    const cancelled = f.status === "cancelled_hidden" || f.status === "cancelled_shown";
    const isEvent = f.event_kind && f.event_kind !== "fixture";
    const rowStyle = cancelled ? "opacity:0.5" : "";
    const statusBadge = f.status === "cancelled_shown"
      ? '<span class="badge" style="background:#2a1010;color:#ff6666">CANCELLED</span>'
      : f.status === "cancelled_hidden"
      ? '<span class="badge" style="background:#222;color:#555">HIDDEN</span>'
      : "";
    const typeBadge = isEvent
      ? (KIND_BADGES[f.event_kind] || KIND_BADGES.training)
      : (TYPE_BADGES[f.fixture_type || "league"] || TYPE_BADGES.league);
    const isActuallyHome = f.home_team === team.name;
    const opponentName   = isActuallyHome ? (f.away_team || "") : (f.home_team || "");
    const fType = f.fixture_type || "league";

    const avail = availability[f.uid];
    const availCell = avail
      ? `<a href="/dashboard/availability/${f.uid}" style="text-decoration:none;font-size:0.78rem;white-space:nowrap">
           <span style="color:#4caf50;font-weight:700">✓${avail.going}</span>
           <span style="color:#f0b429;font-weight:700;margin-left:4px">?${avail.maybe}</span>
           <span style="color:#ff6666;font-weight:700;margin-left:4px">✗${avail.no}</span>
         </a>`
      : '<span style="color:var(--text-5);font-size:0.75rem">—</span>';

    return `
    <tr style="${rowStyle}">
      <td>${fmtDate(f.start_time)} ${statusBadge}</td>
      ${isEvent ? `
      <td colspan="3"><strong>${f.summary}</strong></td>
      ` : `
      <td><strong>${f.home_team || f.summary}</strong></td>
      <td style="color:var(--red);font-weight:900">VS</td>
      <td><strong>${f.away_team || ""}</strong></td>
      `}
      <td style="color:#888">${f.location || "TBC"}</td>
      <td>${typeBadge}</td>
      <td>${isEvent ? "" : (isActuallyHome ? '<span class="badge badge-standard">Home</span>' : '<span class="badge badge-free">Away</span>')}</td>
      <td>${availCell}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        ${!cancelled ? `
          <button onclick="openReschedule('${f.uid}','${f.summary.replace(/'/g,"\\'")}','${f.start_time}','${f.end_time}')"
            class="btn btn-secondary btn-sm">Reschedule</button>
          ${!isEvent ? `
          <button onclick="openEdit('${f.uid}','${opponentName.replace(/'/g,"\\'")}','${isActuallyHome}','${(f.location||'').replace(/'/g,"\\'")}','${(f.description||'').replace(/'/g,"\\'")}','${fType}')"
            class="btn btn-secondary btn-sm">Edit</button>` : ""}
          <button onclick="openCancel('${f.uid}','${f.summary.replace(/'/g,"\\'")}')"
            class="btn btn-sm" style="background:rgba(224,40,40,0.12);color:#f87171;border:1px solid rgba(224,40,40,0.3)">Cancel</button>
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
          style="background:var(--input-bg);border:1px solid var(--border2);color:var(--text-3);padding:8px 12px;font-size:0.82rem;cursor:pointer;flex:1;min-width:160px;border-radius:8px">
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
            <select name="isHome" id="add-ishome" onchange="autoFillAddVenue(this.value)">
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
            <input type="text" name="location" id="add-venue" placeholder="e.g. Riverside Stadium">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Fixture Type</label>
            <select name="fixtureType">
              <option value="league">League / Standard</option>
              <option value="cup">Cup Game</option>
              <option value="tournament">Tournament</option>
              <option value="festival">Festival</option>
            </select>
          </div>
          <div class="form-group" style="flex:2">
            <label>Competition / Description</label>
            <input type="text" name="description" placeholder="e.g. Premier League — Matchday 3">
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Add Fixture</button>
      </form>
    </div>

    <!-- Add Training / Event -->
    <div class="card">
      <div class="card-title">Add Training / Event</div>
      <form method="POST" action="/dashboard/events/add">
        <div class="form-row">
          <div class="form-group">
            <label>Event Type</label>
            <select name="kind">
              <option value="training">Training</option>
              <option value="meeting">Meeting</option>
              <option value="social">Social</option>
              <option value="duty">Volunteer Duty</option>
            </select>
          </div>
          <div class="form-group" style="flex:2">
            <label>Title</label>
            <input type="text" name="title" required placeholder="e.g. Tuesday Training">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Date</label>
            <input type="date" name="date" required>
          </div>
          <div class="form-group">
            <label>Start Time (UTC)</label>
            <input type="time" name="startTime" required>
          </div>
          <div class="form-group">
            <label>End Time (UTC)</label>
            <input type="time" name="endTime" required>
          </div>
          <div class="form-group">
            <label>Venue</label>
            <input type="text" name="location" placeholder="e.g. Training Ground">
          </div>
        </div>
        <div class="form-row" style="align-items:flex-end">
          <div class="form-group" style="flex:2">
            <label>Notes (optional)</label>
            <input type="text" name="description" placeholder="e.g. Bring boots and a drink">
          </div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;text-transform:none;letter-spacing:0;padding:9px 0">
              <input type="checkbox" name="repeatWeekly" value="1" style="width:auto;accent-color:#cc0000"
                onchange="document.getElementById('repeat-until-wrap').style.display = this.checked ? 'flex' : 'none'">
              Repeat weekly
            </label>
          </div>
          <div class="form-group" id="repeat-until-wrap" style="display:none">
            <label>Repeat Until</label>
            <input type="date" name="repeatUntil">
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Add Event</button>
      </form>
    </div>

    <!-- Fixtures Table -->
    <div class="card">
      <div class="card-title">All Fixtures & Events (${fixtures.length})</div>
      ${fixtures.length ? `
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Home</th>
            <th></th>
            <th>Away</th>
            <th>Venue</th>
            <th>Type</th>
            <th>H/A</th>
            <th>Availability</th>
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
        <div style="background:var(--input-bg);border-left:3px solid var(--border2);padding:8px 12px;margin-bottom:16px;font-size:0.82rem;color:var(--text-3);border-radius:0 8px 8px 0">
          Current date: <span id="reschedule-current" style="color:var(--text-2);font-weight:700"></span>
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
      const HOME_VENUE = ${JSON.stringify(homeVenue || '')};

      // Auto-fill venue on Add Fixture form when switching to Home
      function autoFillAddVenue(isHome) {
        if (!HOME_VENUE) return;
        const venueField = document.getElementById('add-venue');
        if (isHome === 'true') {
          if (!venueField.value) venueField.value = HOME_VENUE;
        }
      }
      // Pre-fill on page load if Home is selected
      (function() {
        const sel = document.getElementById('add-ishome');
        if (sel && sel.value === 'true' && HOME_VENUE) {
          const v = document.getElementById('add-venue');
          if (v && !v.value) v.value = HOME_VENUE;
        }
      })();

      // Auto-fill venue in Edit modal when switching to Home
      function autoFillEditVenue(isHome) {
        if (!HOME_VENUE) return;
        const venueField = document.getElementById('edit-location');
        if (isHome === 'true' && !venueField.value) {
          venueField.value = HOME_VENUE;
        }
      }

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
      function openEdit(uid, opponent, isHome, location, description, fixtureType) {
        document.getElementById('edit-uid').value = uid;
        document.getElementById('edit-opponent').value = opponent;
        document.getElementById('edit-ishome').value = String(isHome) === 'true' ? 'true' : 'false';
        document.getElementById('edit-location').value = location;
        document.getElementById('edit-description').value = description;
        document.getElementById('edit-type').value = fixtureType || 'league';
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
              <select name="isHome" id="edit-ishome" onchange="autoFillEditVenue(this.value)">
                <option value="true">Home</option>
                <option value="false">Away</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group" style="margin-bottom:14px">
              <label>Fixture Type</label>
              <select name="fixtureType" id="edit-type">
                <option value="league">League / Standard</option>
                <option value="cup">Cup Game</option>
                <option value="tournament">Tournament</option>
                <option value="festival">Festival</option>
              </select>
            </div>
            <div class="form-group" style="flex:2;margin-bottom:14px">
              <label>Competition / Description</label>
              <input type="text" name="description" id="edit-description" placeholder="e.g. Premier League — Matchday 3">
            </div>
          </div>
          <div class="form-group" style="margin-bottom:16px">
            <label>Venue</label>
            <input type="text" name="location" id="edit-location" placeholder="e.g. Riverside Stadium">
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
            <label style="display:flex;align-items:flex-start;gap:12px;background:var(--row-hover);padding:14px;cursor:pointer;border:1px solid var(--border2);border-radius:10px">
              <input type="radio" name="cancelType" value="shown" checked style="margin-top:3px;width:auto">
              <div>
                <div style="font-weight:700;font-size:0.85rem">Show as Cancelled</div>
                <div style="color:var(--text-4);font-size:0.78rem;margin-top:3px">Fixture stays on the public page marked as CANCELLED. Calendar shows it as cancelled.</div>
              </div>
            </label>
            <label style="display:flex;align-items:flex-start;gap:12px;background:var(--row-hover);padding:14px;cursor:pointer;border:1px solid var(--border2);border-radius:10px">
              <input type="radio" name="cancelType" value="hidden" style="margin-top:3px;width:auto">
              <div>
                <div style="font-weight:700;font-size:0.85rem">Remove Completely</div>
                <div style="color:var(--text-4);font-size:0.78rem;margin-top:3px">Hidden from public page. Removed from subscribed calendars automatically.</div>
              </div>
            </label>
          </div>
          <div style="display:flex;gap:10px">
            <button type="submit" class="btn btn-sm" style="background:var(--red);color:#fff">Confirm Cancellation</button>
            <button type="button" onclick="closeCancel()" class="btn btn-secondary">Keep Fixture</button>
          </div>
        </form>
      </div>
    </div>
  `;

  return layout(`${team.name} Dashboard`, content, user);
}

module.exports = { homePage };
