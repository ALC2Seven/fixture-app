# FixtureApp Roadmap

Positioning: **the clearest fixture-first communications platform for grassroots sport** —
best-in-class calendar updates, dead-simple availability, trusted parent/guardian workflows,
and (later) official WhatsApp messaging that updates the real system of record.
Sits between Teamer/Heja-style simplicity and Pitchero/TeamSnap-style breadth.
Avoid: BAND-style feed sprawl, TeamSnap-ONE-style maximal breadth, live streaming/media/CMS.

Monetisation principle: generous free team-level entry; charge for club administration,
payment-linked workflows, domains, reporting, premium communications.

---

## Phase 1 — Daily workflow + design refresh (CURRENT)

The weekly loop a volunteer coach touches must be faster than WhatsApp + spreadsheet.

- [x] **Design refresh** — card-based fixture layout (Super League reference):
      date-tab cards, teams either side of a centre time/venue block, filter pills,
      works in both dark and light themes. Public page done; dashboard restyle still open.
- [x] **Event model** — fixtures table generalised with event_kind
      (fixture/training/meeting/social/duty) + recurrence_group; Add Event form
      with weekly repeat (capped at 60); events flow into ICS feed and public page tabs.
- [x] **Availability / RSVP** — one-tap Going / Maybe / Can't per event for
      logged-in fans on the public page; coach sees ✓/?/✗ roll-up per event in the
      dashboard plus a detail page (/dashboard/availability/:uid). Still to come:
      tokenized one-tap RSVP links in emails (with reminders), notes UI, guardian responses (Phase 2).
- [x] **Automatic reminders** — hourly sweep emails subscribers 72h before each
      event (paid tiers), one per event, with tokenized one-tap Going/Maybe/Can't
      links that work without login (GET /rsvp, HMAC-signed). Later: push/WhatsApp,
      chase non-responders specifically.
- [x] **Announcement messaging** — /dashboard/messages: compose broadcast to all
      subscribers (Standard/Pro), confirmation prompt, HTML-escaped body with line
      breaks, full send history retained in announcements table. Free tier sees upsell.
      Later: role-based recipient filters, reply threads (Phase 2).
- [x] **Add-to-calendar UX** — calendar chooser modal on the team page
      (Apple webcal / Google / Outlook one-tap links + copy URL), same three
      buttons per team on My Teams, and on the dashboard feed page.
      Later: per-fixture-type subscriptions.
- [x] **Homepage redesign** — new concept flow (publish → share one link → stays in
      sync), modern slick styling (Inter, deep navy, rounded cards, product mockup
      with RSVP in hero, clubs-vs-supporters split section). Pricing/signup/dashboard
      restyle to the same language still open.
- [x] **Mobile dashboard polish** — sidebar becomes a horizontal tab bar under 760px,
      tables scroll horizontally inside cards, stats go two-up, forms stack full-width.

**Phase 1 complete (June 2026).**

## Phase 2 — Structure and trust

- [~] Roles & hierarchy:
      - [x] Club-level roles: owner / manager / coach with permission guards
            (settings+members = owner; messages+subscribers = owner+manager;
            fixtures/events/availability = all). Invite flow with emailed +
            copyable signed links (/dashboard/members), last-owner protection.
      - [ ] Multi-squad clubs (one club, many teams) with per-squad delegation.
      - [ ] Welfare/safeguarding officer role (with guardian work below).
- [ ] Guardian-linked accounts: parental visibility of child comms, family-level RSVP,
      consent/document capture, audit logs, merged family view across children/teams.
- [ ] Matchday layer: line-ups, results, scorers, simple league table, match reports.
      (Deeper stats engine later, tiered.)
- [ ] WhatsApp channel (Cloud API): opt-in outbound notifications, template messages,
      interactive Going/Maybe/Can't buttons updating FixtureApp via webhook.
      FixtureApp stays the source of truth; messages mirrored in-app for auditability.

## Phase 3 — Club operating system (carefully, not all at once)

- [ ] Payments & registration (Stripe): recurring subs, match fees, registration forms,
      multi-child/discount logic, offline payment recording, reminders.
- [ ] Competition data imports (league fixtures/results/tables — Pitchero benchmark).
- [ ] Club websites / custom domain per club.
- [ ] Sponsor / fundraising modules.

## Adjacent — validate before building

- [ ] **Free tools bundle** for acquisition: round-robin generator, cup/bracket generator,
      groups+knockout planner, venue/time allocator; export to PDF/CSV/public page/calendar.
      Use these to test tournament demand before building a full tournament product.

---

## Done so far (June 2026)

Fixture CRUD + reschedule/cancel/restore; fixture types (league/cup/tournament/festival)
with colour coding, badges and tab filters; Excel/CSV import with template; live ICS/webcal
feeds with SEQUENCE handling; reschedule/cancellation/venue-change emails (Resend);
fan accounts + subscribe flow + My Teams; club settings (name, home venue, social links,
theme, email, password); dark/light themes; master admin; marketing pages.
