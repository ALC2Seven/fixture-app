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
- [ ] **Automatic reminders** — email (later push/WhatsApp) before events and when no response.
- [ ] **Announcement messaging** — broadcast from club to subscribers/members,
      distinct from future conversational messaging. Message log retained.
- [ ] **Add-to-calendar UX** — one-tap Google / Apple / Outlook flows,
      per-fixture-type subscriptions, cleaner manage-subscription controls. (ECAL is the benchmark.)
- [ ] **Mobile dashboard polish** — fixture add/edit/cancel and availability checks must be excellent on a phone.

## Phase 2 — Structure and trust

- [ ] Roles & hierarchy: club owner, club admin, welfare officer, coach, team manager,
      parent/guardian, player, supporter. Permissions at club / squad / event level.
      Multi-team clubs with delegated management.
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
