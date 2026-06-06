const { fanLayout } = require("./layout");

function fanSignupPage(error, returnTo) {
  const content = `
    <div class="page-header">
      <h1>Create Free Account</h1>
      <p>Follow your teams and get notified when fixtures change.</p>
    </div>
    ${error ? `<div class="alert alert-error">${error}</div>` : ""}
    <div class="card">
      <form method="POST" action="/fan/signup">
        ${returnTo ? `<input type="hidden" name="returnTo" value="${returnTo}">` : ""}
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" name="email" required placeholder="your@email.com" autofocus>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" name="password" required placeholder="At least 8 characters" minlength="8">
        </div>
        <div class="form-group">
          <label>Confirm Password</label>
          <input type="password" name="confirm" required placeholder="Repeat password">
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center">Create Account</button>
      </form>
    </div>
    <p style="text-align:center;color:#555;font-size:0.82rem;margin-top:16px">
      Already have an account? <a href="/fan/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}" style="color:#cc0000;text-decoration:none">Log in</a>
    </p>
  `;
  return fanLayout("Create Account", content, null);
}

module.exports = { fanSignupPage };
