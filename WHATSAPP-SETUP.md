# WhatsApp Channel — Prep Checklist

Single platform-owned channel: one Meta Business account and one WhatsApp number that
FixtureApp sends through for every club ("⚽ City FC: Training tomorrow at 18:00...").
Clubs do NOT need their own numbers. Per-club branded numbers via Embedded Signup is a
possible Pro/Enterprise add-on much later.

## Your tasks (Andrew) — start early, Meta verification can take days–weeks

### 1. Meta Business setup
- [ ] Create a Meta Business account at business.facebook.com (use a company email,
      ideally on your custom domain once you have it)
- [ ] Complete **Business Verification** (Business Settings → Security Centre) —
      needs business name, address, and a document or website/phone check.
      This is the long pole — start it first.

### 2. Phone number
- [ ] Get a dedicated phone number for WhatsApp — NOT your personal mobile and not a
      number already registered to a WhatsApp account. A cheap SIM or virtual number
      (e.g. a VoIP number that can receive SMS/voice for the one-time verification) works.
- [ ] Keep it safe — once registered to the WhatsApp Business API it can't easily be
      reused for the normal WhatsApp app.

### 3. Developer / Cloud API setup
- [ ] Create an app at developers.facebook.com → type "Business" → add the
      **WhatsApp** product
- [ ] Link it to your Meta Business account
- [ ] Register the dedicated phone number under WhatsApp → API Setup
- [ ] Set the display name (e.g. "FixtureApp") — Meta reviews it; it should match
      your business/site
- [ ] Generate a **permanent system-user access token** (Business Settings →
      System Users) with whatsapp_business_messaging permission — this is what
      goes in Railway as an env var later

### 4. Message templates (submit for approval once API access works)
Drafts we will register (Claude writes final wording at build time):
- [ ] `fixture_reminder` — event name, date/time, venue + Going/Maybe/Can't quick replies
- [ ] `fixture_change` — reschedule/venue change notice
- [ ] `fixture_cancelled` — cancellation notice
- [ ] `club_announcement` — generic announcement body

### 5. Hand over to Claude for the build
- [ ] Provide: phone number ID, WhatsApp Business Account ID, permanent token
      (all go into Railway env vars: WHATSAPP_PHONE_ID, WHATSAPP_WABA_ID, WHATSAPP_TOKEN)
- [ ] Build then covers: opt-in capture per club in the subscribe flow, template
      sends alongside email, webhook receiver for button replies → availability,
      in-app message mirror for auditability

## Notes
- Costs: Meta bills per conversation (pennies per message, varies by country) —
  platform pays, so WhatsApp delivery should be a Standard/Pro metered feature.
- Compliance: opt-in is mandatory before messaging anyone; outbound notifications
  use pre-approved templates; recipients can reply STOP — we must honour it.
