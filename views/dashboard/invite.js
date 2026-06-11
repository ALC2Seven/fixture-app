const { layout } = require("./layout");

function invitePage(invite, error) {
  const roleLabel = invite.role.charAt(0).toUpperCase() + invite.role.slice(1);
  const content = `
    <div style="max-width:440px;margin:60px auto">
      <div class="page-header" style="text-align:center">
        <h1>Join ${invite.team_name}</h1>
        <p>You've been invited as a <strong>${roleLabel}</strong>. Set a password to get started.</p>
      </div>
      ${error ? `<div class="alert alert-error">${error}</div>` : ""}
      <div class="card">
        <form method="POST" action="/invite/${invite.token}">
          <div class="form-group" style="margin-bottom:14px">
            <label>Email</label>
            <input type="email" value="${invite.email}" disabled style="color:var(--text-4);cursor:not-allowed">
          </div>
          <div class="form-group" style="margin-bottom:14px">
            <label>Password</label>
            <input type="password" name="password" required minlength="8" placeholder="At least 8 characters" autofocus>
          </div>
          <div class="form-group" style="margin-bottom:20px">
            <label>Confirm Password</label>
            <input type="password" name="confirmPassword" required placeholder="Repeat password">
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center">Join ${invite.team_name}</button>
        </form>
      </div>
    </div>
  `;
  return layout("Join " + invite.team_name, content, null);
}

module.exports = { invitePage };
