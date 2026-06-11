# Custom Domain Move — Task Checklist

Everything that needs to happen when FixtureApp moves from
`fixture-app-production.up.railway.app` to its own domain (e.g. `fixtureapp.co.uk`).

## Your tasks (Andrew)

### 1. Buy the domain
- [ ] Register the domain (any registrar — Namecheap, Cloudflare, GoDaddy etc.)
- [ ] Consider also registering close variants (.com/.co.uk) if cheap, to redirect later

### 2. Point the domain at Railway
- [ ] Railway → your service → **Settings → Networking → Custom Domain** → add the domain
- [ ] Railway shows you a **CNAME** record — add it at your registrar's DNS panel
- [ ] Wait for the green tick in Railway (TLS certificate is automatic)
- [ ] Decide on www vs apex: add both in Railway and redirect one to the other
      (most registrars can do an apex → www forward, or use Cloudflare DNS which
      supports CNAME flattening at the apex)

### 3. Update Railway environment variables
- [ ] `APP_URL` = `https://yourdomain.com` (no trailing slash) — this drives all
      email links (RSVP buttons, "view fixtures" links)
- [ ] While you're there, confirm `SESSION_SECRET` is set to a long random value
      (not the changeme default) — log out/in again afterwards
- [ ] Confirm `RESEND_API_KEY` and `MASTER_KEY` are set properly

### 4. Verify the domain in Resend (email sending)
- [ ] Resend dashboard → **Domains → Add Domain** → enter your domain
- [ ] Add the DNS records Resend gives you at your registrar:
      - TXT record for **SPF**
      - CNAME/TXT records for **DKIM** (usually 2–3 records)
      - Recommended: a **DMARC** TXT record (Resend suggests one)
- [ ] Wait for Resend to show "Verified" (minutes to a few hours)
- [ ] Decide the from-address, e.g. `updates@yourdomain.com`
- [ ] **Tell Claude the from-address** → code change swaps all
      `onboarding@resend.dev` senders to it (5 spots in server.js)
- [ ] Until this is done, emails only deliver to your own verified Resend
      address — do not onboard real clubs before this step

### 5. Sanity checks after switchover
- [ ] Homepage, signup, dashboard login all load on the new domain
- [ ] Public team page loads; **calendar subscribe links** work (they are built
      from the request host, so they update automatically — but test Apple,
      Google and Outlook flows once each)
- [ ] Send yourself a reminder/announcement and click an RSVP button in the
      email — confirms `APP_URL` is right
- [ ] Existing calendar subscribers: their old `webcal://...railway.app` feeds
      keep working as long as the Railway domain stays attached — leave it
      attached indefinitely; new subscribers get the new domain automatically

## Code tasks (Claude — say the word once the domain is live)
- [ ] Swap email `from:` addresses to the verified domain sender
- [ ] Update the `APP_URL` fallback default in server.js
- [ ] Update the signup page slug preview text ("fixtureapp.com/…") to the real domain
- [ ] Optional: 301 redirect middleware from the railway.app host to the new domain
- [ ] Optional: set the calendar feed `prodId` / footer branding to the new domain
