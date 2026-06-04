const { layout } = require("./layout");

function loginPage(error) {
  const content = `
    <div style="max-width:400px;margin:60px auto;">
      <div class="page-header">
        <h1>Dashboard <span style="color:#cc0000">Login</span></h1>
        <p>Sign in to manage your club fixtures.</p>
      </div>
      ${error ? `<div class="alert alert-error">${error}</div>` : ""}
      <div class="card">
        <form method="POST" action="/dashboard/login">
          <div class="form-group" style="margin-bottom:12px">
            <label>Email</label>
            <input type="email" name="email" required autofocus placeholder="you@yourclub.com">
          </div>
          <div class="form-group" style="margin-bottom:20px">
            <label>Password</label>
            <input type="password" name="password" required placeholder="••••••••">
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center">Sign In</button>
        </form>
      </div>
    </div>
  `;
  return layout("Login", content, null);
}

module.exports = { loginPage };
