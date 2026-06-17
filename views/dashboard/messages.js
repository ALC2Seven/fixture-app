const { layout } = require("./layout");

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function messagesPage(user, team, announcements, subscriberCount, flash) {
  const isPaid = team.tier === "standard" || team.tier === "pro";

  const composeCard = isPaid ? `
    <div class="card">
      <div class="card-title">Send an Announcement</div>
      <p style="color:var(--text-4);font-size:0.8rem;margin-bottom:16px">
        Emails all <strong style="color:var(--text-2)">${subscriberCount}</strong> subscriber${subscriberCount === 1 ? "" : "s"} immediately.
        Use it for news that isn't tied to one fixture — kit days, fundraising, season updates.
      </p>
      <form method="POST" action="/dashboard/messages/send" onsubmit="return confirmSend()">
        <div class="form-group" style="margin-bottom:14px">
          <label>Subject</label>
          <input type="text" name="subject" required maxlength="200" placeholder="e.g. Presentation day — Saturday 12 July">
        </div>
        <div class="form-group" style="margin-bottom:16px">
          <label>Message</label>
          <textarea name="body" required rows="7" maxlength="5000"
            placeholder="Write your announcement. Line breaks are kept."></textarea>
        </div>
        <button type="submit" class="btn btn-primary" ${subscriberCount === 0 ? "disabled style='opacity:0.5;cursor:not-allowed'" : ""}>
          📣 Send to ${subscriberCount} subscriber${subscriberCount === 1 ? "" : "s"}
        </button>
        ${subscriberCount === 0 ? `<p style="color:var(--text-4);font-size:0.78rem;margin-top:10px">No subscribers yet — share your public page to get supporters signed up.</p>` : ""}
      </form>
    </div>
    <script>
      function confirmSend() {
        return confirm('Send this announcement to ${subscriberCount} subscriber${subscriberCount === 1 ? "" : "s"} now? This cannot be undone.');
      }
    </script>
  ` : `
    <div class="card">
      <div class="card-title">Send an Announcement</div>
      <p style="color:var(--text-3);font-size:0.88rem;margin-bottom:16px">
        Announcements let you email all your subscribers at once — club news, kit days,
        fundraising, season updates. Available on the <strong>Standard</strong> plan (£4.99/month).
      </p>
      <a href="/pricing" class="btn btn-primary">Upgrade to Standard</a>
    </div>
  `;

  const historyRows = announcements.map(a => `
    <tr>
      <td style="white-space:nowrap">${fmtDate(a.created_at)}</td>
      <td><strong>${a.subject}</strong>
        <div style="color:var(--text-4);font-size:0.78rem;margin-top:3px;max-width:480px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.body}</div>
      </td>
      <td style="white-space:nowrap">${a.sent_to} recipient${a.sent_to === 1 ? "" : "s"}</td>
    </tr>
  `).join("");

  const content = `
    ${flash ? `<div class="alert alert-${flash.type}">${flash.msg}</div>` : ""}

    <div class="page-header">
      <h1>Messages</h1>
      <p>Broadcast announcements to everyone subscribed to ${team.name}.</p>
    </div>

    ${composeCard}

    <div class="card">
      <div class="card-title">Sent Announcements (${announcements.length})</div>
      ${announcements.length ? `
      <table>
        <thead><tr><th>Sent</th><th>Announcement</th><th>Recipients</th></tr></thead>
        <tbody>${historyRows}</tbody>
      </table>` : `<p style="color:var(--text-4);font-size:0.85rem">Nothing sent yet.</p>`}
    </div>
  `;

  return layout("Messages", content, user);
}

module.exports = { messagesPage };
