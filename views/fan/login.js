const { fanLayout } = require("./layout");

function fanLoginPage(error, returnTo) {
  const content = `
    <div class="page-header">
      <h1>Log In</h1>
      <p>Access your team subscriptions.</p>
    </div>
    ${error ? `<div class="alert alert-error">${error}</div>` : ""}
    <div class="card">
      <form method="POST" action="/fan/login">
        ${returnTo ? `<input type="hidden" name="returnTo" value="${returnTo}">` : ""}
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" name="email" required placeholder="your@email.com" autofocus>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" name="password" required placeholder="Your password">
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center">Log In</button>
      </form>
    </div>
    <p style="text-align:center;color:#555;font-size:0.82rem;margin-top:16px">
      Don't have an account? <a href="/fan/signup${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}" style="color:#cc0000;text-decoration:none">Sign up free</a>
    </p>
  `;
  return fanLayout("Log In", content, null);
}

module.exports = { fanLoginPage };
