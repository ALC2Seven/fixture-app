# FixtureApp — End-to-End Test Plan (June 2026)

Covers everything built through Phase 1 + Phase 2.

## Accounts needed: 6

Tip: Gmail treats `you+anything@gmail.com` as unique addresses that all land in
your normal inbox — so one real mailbox covers all six.

| # | Account | Email suggestion | Purpose |
|---|---------|------------------|---------|
| 1 | Master | (existing master login) | Set the test club's tier to Standard |
| 2 | Club Owner | existing club account | Full club admin, settings, members, activity |
| 3 | Manager | you+manager@… | Invited member — messages/subscribers but no settings |
| 4 | Coach (restricted) | you+coach@… | Invited member — later restricted to one squad |
| 5 | Fan A (guardian) | **your real Resend-verified email** | Whole-club subscriber with family members — must be the Resend email so reminder/RSVP emails actually arrive (sandbox only delivers to that address) |
| 6 | Fan B (squad fan) | you+fanb@… | Single-squad subscriber — verifies email targeting by *absence* (they shouldn't get other squads' emails; with sandbox they won't receive mail anyway, so check subscriber lists instead) |

⚠️ Resend sandbox limitation: only the email registered to your Resend account
receives mail. All other addresses will silently fail to deliver. Email-content
tests are therefore done with Fan A only; for everyone else verify the
*subscriber counts* reported in flash messages.

---

## 1. Marketing & onboarding
- [ ] Homepage loads, mockup card renders, nav links work (pricing, club login, supporter login)
- [ ] Pricing page renders, FAQ readable
- [ ] Club signup: slug auto-generates from club name; reserved slug (e.g. "dashboard") rejected; short password rejected; home venue captured
- [ ] After signup you land in the dashboard on the Free tier

## 2. Master controls
- [ ] Log in as Master → All Teams shows the club with fixture/subscriber counts
- [ ] Set the test club to **Standard** (needed for calendar/email/RSVP/reminders/announcements)

## 3. Club settings (as Owner)
- [ ] Rename club; slug stays fixed
- [ ] Home Ground: set venue; "apply to all home fixtures" updates existing ones
- [ ] Squads: add **U10s** and **U12s**; duplicate name rejected
- [ ] Theme: switch Light ↔ Dark — dashboard AND public page both change
- [ ] Social links: set Facebook/Instagram/TikTok → appear under Subscribe on public page; blank one disappears
- [ ] Public Line-Ups toggle exists and defaults OFF
- [ ] Change email, change password (wrong current password rejected)

## 4. Fixtures & events
- [ ] Add fixture (Home): venue auto-fills from home ground; pick type Cup + squad U10s
- [ ] Add fixture (Away): no auto-fill
- [ ] Add Training event, weekly repeat for ~6 weeks → "6 weekly sessions created"
- [ ] Add a Social event (club-wide, no squad)
- [ ] Download import template → has Date/Time/Opponent/Home-Away/Venue/Type/Competition/Squad columns with dropdowns
- [ ] Import a few rows incl. one with Squad=U12s, one bad date row → import count + error count reported; duplicate re-import skipped
- [ ] Edit fixture: change opponent, type, squad, venue → venue-change email triggered (check flash count)
- [ ] Reschedule: end time auto-keeps duration; reason field; flash says subscribers notified
- [ ] Cancel (shown): fixture stays on public page marked CANCELLED
- [ ] Cancel (hidden): disappears from public page
- [ ] Restore a cancelled fixture

## 5. Public page (logged out)
- [ ] Hero compact, title, subscribe button, social icons
- [ ] Date-tab cards grouped by month; NEXT FIXTURE marker on the first upcoming
- [ ] Type pills (All/League/Cup/…) filter rows and hide empty months
- [ ] Squad pills (All Squads/U10s/U12s) — squad filter keeps club-wide events visible
- [ ] Both filters combine correctly
- [ ] Past Fixtures toggle sits above the list, collapsed by default
- [ ] Check both themes; check phone width (rows stack, "vs" divider)

## 6. Fan accounts & subscriptions
- [ ] Subscribe prompt (logged out) → modal → create Fan A account → returned to team page
- [ ] Fan A: subscribe **Whole club** → success banner + Add to Calendar
- [ ] Calendar chooser modal: Apple/Google/Outlook buttons + copy link all work
- [ ] Fan B: create account, subscribe **U10s only**
- [ ] My Teams: Fan B shows "· U10s" and calendar links carry ?squad=
- [ ] Unsubscribe and re-subscribe works
- [ ] Dashboard → Subscribers shows both fans (Fan B usage visible)

## 7. Family & RSVP
- [ ] Fan A → My Teams → My Family: add two children
- [ ] Team page (Fan A): each upcoming event shows You + both children rows of Going/Maybe/Can't
- [ ] Tap responses for different people → highlighted independently; "n going" count appears
- [ ] Change a response → updates
- [ ] Dashboard fixture row shows ✓/?/✗ counts → availability detail page lists children as "Name via parent@…"

## 8. Emails (Fan A / Resend address only)
- [ ] Reschedule a fixture → email arrives with old/new time
- [ ] Cancel → cancellation email
- [ ] Change venue via Edit → venue-change email
- [ ] Create an event starting within 72h → within ~an hour (or after a redeploy restarts the sweep) reminder email arrives with Going/Maybe/Can't buttons
- [ ] Click an email RSVP button **without being logged in** → confirmation page; change answer from that page; dashboard availability reflects it
- [ ] Squad targeting: U12s fixture changes should NOT email Fan B (U10s) — verify via flash recipient counts

## 9. Announcements
- [ ] Messages page: compose + send → confirm prompt → flash with recipient count; history row recorded
- [ ] Fan A receives the announcement email
- [ ] Free-tier club (create a throwaway) sees the upgrade prompt instead

## 10. Results & matchday
- [ ] Past fixture → Add Result: scores, scorers, report → W/L/D badge with score in dashboard
- [ ] Public page: "FULL TIME 3–1", Win/Draw/Loss pill, scorers line, expandable match report
- [ ] Season record strip correct (P/W/D/L/For/Against) + form dots
- [ ] Edit result, then Clear result → record updates
- [ ] Events (training) have no result button

## 11. Players & line-ups
- [ ] Players page: add players to U10s, U12s and unassigned; remove one
- [ ] Fixture → Line-up: U10s fixture shows only U10s + unassigned players; tick a team; count updates; save
- [ ] Public page: line-up NOT visible (toggle off)
- [ ] Settings → enable Public Line-Ups → "Line-up (n)" appears on the fixture

## 12. Roles, members & delegation
- [ ] Members page: invite Manager (manager role) and Coach (coach role); invite emails best-effort, copy links shown
- [ ] Accept both invites in a private window (set passwords, land in dashboard)
- [ ] Manager: sees Messages/Subscribers but no Members/Activity; Settings shows only account cards; club-setting URLs hit directly are rejected
- [ ] Coach: no Messages/Subscribers links; can add fixtures/events and line-ups
- [ ] Owner assigns Coach to U10s only → Coach sees "View only" on U12s/club-wide rows; direct POSTs are denied; import blocked
- [ ] Role change Coach→Manager and back works; can't remove yourself; can't demote/remove last owner
- [ ] Activity page (Owner): all of the above actions logged with actor emails

## 13. Calendar feeds (real calendar app)
- [ ] Subscribe to the club feed in Google/Apple Calendar — fixtures AND training appear; squad-prefixed titles ("U10s: …")
- [ ] Subscribe to ?squad=U10s feed — only U10s + club-wide events; calendar named "Club — U10s"
- [ ] Reschedule a fixture → calendar updates itself (allow for refresh interval — Google can take hours; Apple respects ~30min TTL better)
- [ ] Cancel (shown) → event marked cancelled; cancel (hidden) → removed

## 14. Mobile dashboard
- [ ] Phone: sidebar becomes horizontal tabs; fixtures table scrolls inside card; add-fixture form stacks; modals usable

---

### Suggested order
2 → 3 → 4 → 5 (core club flow), then 6 → 7 (fans), 8 → 9 (email), 10 → 11
(matchday), 12 (roles), 13 (calendars, start early — sync takes time), 14 last.

### Logging issues
Note them as you go (page, steps, expected vs actual, account used) and hand the
list back to Claude in one batch — most fixes will be quick.
