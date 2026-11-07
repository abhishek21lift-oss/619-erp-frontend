# UI text audit — MY PT STUDIO frontend (2026-10-20)

Scope: every page under `src/app/**` of `619-erp-frontend` (Next.js 16 / React 19 / Tailwind 3),
plus the shared components those pages render. Read-only audit first, then a copy-only edit pass.
No API, schema, business or assessment logic was touched. No dependency was added.

Method: four parallel read-only audits (pt-os routes; finance + insights; chrome + settings + AI;
member + landing), each row verified against the source before editing. Classes used throughout:

| class | meaning |
|---|---|
| RESTATES | repeats a heading/title two rows away |
| DECORATIVE | adds mood, not information |
| DUPLICATE | the same fact already on the same screen |
| INSTRUCTION | tells the reader something they cannot infer — kept, shortened |
| SAFETY | warning, consent, eligibility, measurement condition, money/clinical fact — untouched |
| KEEP | confirmed load-bearing |

## 1. Global content rules applied

1. A sentence stays only if it carries a fact the reader cannot see on the same screen.
2. One fact, one place: when two surfaces printed it, the actionable one survived (counters and
   buttons over prose).
3. Instructions stay, shortened to one line, and may move behind a disclosure — never warnings.
4. Numbers, units, dates, statuses, names, errors and money are never reworded, only un-duplicated.
5. Empty states keep the fix ("Add a date of birth from a client's Edit page"), drop the mood.
6. No type-scale churn: the repo has a deliberate half-step ladder (9.5/10.5/11.5/12.5/13.5) that
   `src/__tests__/scale.test.ts` locks. Text volume was reduced, sizes were not.

## 2. Changed, per page

### pt-os

| file | change |
|---|---|
| `progress/page.tsx` | ClientPicker subtitle → "Pick a client"; "Seven-section review" hero subtitle deleted; two duplicate hero badges (`n unlogged days`, `n assessments on file`) deleted; "Data quality" subtitle deleted; third copy of the baseline story deleted; `n` assessments-on-file folded into one line; "Like-for-like across the recorded protocol" deleted from all seven domain panels (kept on incomparable ones as the reason) |
| `progress-tracking-setup/page.tsx` | "Progress Tracking Overview" kicker deleted; hero tagline deleted; the "Smart Alerts" panel deleted (same five facts on the hero checklist and the five cards) |
| `today/page.tsx` | `· n of m done` dropped from the subtitle (the progress bar below is the same number, and the code comment said so); 3-clause empty state → "Nothing is booked for today."; "· exercises can be added in the session" dropped |
| `clients/[id]/page.tsx` | Payments panel body deleted (both link hints say it); AI Coach body → one line; Reports body second sentence deleted; "Screening & assessments" body deleted |
| `clients/[id]/edit/page.tsx` | "Editing" kicker deleted; "Review all fields before saving" deleted from beside the Save button |
| `messages/page.tsx` | failure line → "Retrying automatically."; empty inbox line → "Messages from your clients arrive here."; "Or start a new one with any client." deleted |
| `clients/birthdays/page.tsx` | "— say hi!" deleted; footer count → `Showing n of m` |
| `macrocycle/page.tsx` | phase count dropped from the block heading; `n days/week:` prefix dropped, day list kept; per-phase "· n weeks" dropped (the range label says it) |
| `diet-plans/page.tsx` | two-line library banner → one line; "Add your first meal…" deleted; unbacked "RECOMMENDED" badge deleted |
| `activity-log/page.tsx` | "Clear a filter to widen the search." deleted |
| `sessions/page.tsx` | "Schedule a PT session to see it here" deleted |
| `schedule-session/page.tsx` | "Book a session to get started" deleted; step-echo modal subtitles deleted |
| `progress-photos/page.tsx` | "Tap to capture" deleted (the Capture button under it says it) |
| `clients/page.tsx` | first-run sentence deleted; the search-miss hint kept |
| `cardio-calculator/page.tsx` | duplicated "Type: …" line deleted |
| `weekly-checkin/page.tsx` | 3-line troubleshooting paragraph → "Please try again." |
| `posture-assessment/page.tsx` | "Step 2 of 2 —" dropped from the notes subtitle |
| `my-schedule/page.tsx` | `You have no sessions <day>.` deleted; now-unused `fmtDayPhrase` helper removed |
| `informed-consent`, `parq` | success screens: echo sentence → name + what was recorded |
| `assessment/page.tsx` | "Assessment Saved" heading dropped, the numbered line now carries it |
| `new-client/page.tsx` | "successfully" dropped from the confirmation |

Not touched (user's uncommitted work): `pt-os/interview/page.tsx`, `pt-os/session-balance/page.tsx`,
`components/pt-os/interview/*`, `lib/http.ts`, `package-lock.json` and the tests beside them.

### chrome, settings, AI, finance

| file | change |
|---|---|
| `checkin/dashboard/page.tsx` | four KPI sub-captions deleted; `sub` prop removed from the local `StatCard` |
| `attendance/page.tsx` | late/absent attention descriptions deleted and `desc` made optional (both restated the title or the button beside them); "All clear" line shortened; "Today, newest first" → "Newest first" |
| `finance/invoices/page.tsx` | duplicate Overdue/Pending hero tiles deleted (the four KPI cards state them); empty state → "No invoices yet" on first run, hint kept on search miss; modal subtitle deleted |
| `finance/forecast/page.tsx` | duplicate "% growth rate" hero pill deleted (the table header states it) |
| `insights/revenue/page.tsx` | panel subtitle trimmed to what the KPI tile above does not already say |
| `insights/traffic/page.tsx` | "n total" badge deleted, `ArrowUpRight` import dropped |
| `settings/profile/page.tsx` | 10 section subtitles removed or shortened; device-tracking paragraph 3 lines → 1; certifications empty state → one line; MFA status sentences → "Active" / "Not enabled"; recovery-codes paragraph halved (both facts kept) |
| `settings/passkeys/page.tsx` | second sentence of the register form deleted; empty state → one line |
| `ai/progress-analysis`, `ai/diet-generator`, `ai/workout-generator` | section sub-captions deleted |
| `ai/business-insights/page.tsx` | first-run hint: action + trust line kept, framing shortened |
| `ai-coach/page.tsx` | header subtitle deleted (its own comment admitted it told the user nothing) |
| `help/page.tsx` | "Reach out to our support team" deleted |
| `support/page.tsx` | empty-state sub-line deleted |
| `training/transformations/page.tsx` | "Every rep, every kg counts!" deleted; line shortened |
| `subscription/packages/page.tsx` | "Create your first PT package to get started." deleted |
| `components/dashboards/PtOsDashboard.tsx` | "— the card above has it" dropped; two long card sentences shortened; "n sessions completed." deleted (heading says it); three-source sentence kept but shortened |
| `components/dashboards/cockpit/NextBestActionCard.tsx` | "What moves the needle right now" deleted |
| `components/ai/AiCommandCenter.tsx` | header line deleted (the composer placeholder already says "Ask AI any time…") |

### K11 — flexibility test protocol (phase 5)

`components/pt-os/fitness-testing/flexibility/TestScreen.tsx`

Before: on a phone the whole protocol (Purpose → Equipment → Positioning → Procedure →
Measurement → Safety → Reference) rendered above the first input.
After: phones show Purpose, Measurement and Safety visible, with Equipment, Positioning,
Procedure and Reference behind one `Instructions` disclosure. The laptop side column is
unchanged (`hidden lg:block`). Both views read the same `content` object, so they cannot disagree.

Safety analysis for this screen: nothing that a decision depends on was hidden. Positioning and
procedure are the trainer's own movement knowledge and are one tap away *while the field is on
screen*; what the test measures, how to measure it, and every contraindication stay visible.
Regression test: `src/__tests__/flexibility-test-screen-protocol.test.tsx`.

## 3. Preserved text, and why

| text | why it stayed |
|---|---|
| K11 safety bullets, measurement rules, reference ranges | assessment integrity |
| `cardio-calculator`: "Frequency: sessions per week are set on the plan, not here." | corrects a wrong mental model; flagged in the audit as a candidate, kept as an INSTRUCTION |
| `weekly-checkin`: units (kg, hours, glasses) and the 10 = worst/best scales | without units the field is meaningless |
| `progress/page.tsx`: "Copied from the assessments, not generated"; testing conditions; re-test policy; sleep reference band; averaging rule | trust and measurement conditions |
| `parq` / `informed-consent`: clearance text, PDF-generation note, consent wording | consent and safety |
| `clients/[id]/edit`: delete-scope warning and "Type {name} to confirm" | destructive action guard |
| `workout-log/[sessionId]`: finish-without-sets confirmation | data-integrity warning |
| `strength-tracking`: when baseline comparison is possible | measurement condition |
| `assessment`: BP-unsafe toast, clearance recommendation | safety |
| All money: balances, dues, "Cleared", trial/renewal dates, coupon amounts, "preserved whatever your plan status" | financial facts |
| `settings/passkeys`: "Your biometric data stays on your device — we only store a cryptographic public key." | privacy claim about biometrics; audit flagged it, kept deliberately (excluded from deletion as a trust statement) |
| `settings/passkeys`: register form "Give this device a name…" | the only instruction for the field |
| `ai/*`: "Usually takes 15–30 seconds" | wait expectation on a long request; prevents double submits |
| `ai-coach`: "— upload SOPs the coach should answer from" | defines what a knowledge base is |
| `help`: "Track replies here in the app" | the only thing distinguishing a ticket from the email link |
| `settings/integrations`: "Try a different category or search term." | tells the reader how to get results |
| `diet-plans`: the one-line "assign a plan or track water from a client's profile" | the only place the missing feature is explained |
| `birthdays`: "Add a date of birth from a client's Edit page to see them here." | directs the fix |
| `clients/[id]/page.tsx` cross-tab repeats ("Packages and sessions left", "Volume, intensity, trend") | the audit flagged them, but each appears once per tab and the tabs are never on screen together — deleting one would remove the only copy in that view |
| emoji/icon-only placeholders, `sr-only` text, `aria-label`s | accessible names |

## 4. Shared components and tokens

Only one new shared file, no token changes:

- `src/components/ui/Disclosure.tsx` (new) + export in `src/components/ui/index.ts`.
  Wraps native `<details>`/`<summary>` with the markerless house styling the repo had already
  hand-rolled three times (`WorkoutLauncher`, `CompletionPanel`, `GenerationContextPanel`).
  Documented as: do not use for a warning or anything a decision depends on.
- `settings/profile/page.tsx`: local `SectionHeader.subtitle` made optional (9 sections no longer
  pass one) and rendered conditionally.
- `attendance/page.tsx`: local `AttentionItem.desc` made optional.
- `checkin/dashboard/page.tsx`: local `StatCard.sub` removed with its last four callers.
- `my-schedule/page.tsx`: `fmtDayPhrase` removed with its last caller.
- Unused imports pruned with the copy they belonged to (`ArrowUpRight`, `CheckCircle`, `AlertTriangle`).

## 5. Verification

Run from `619-erp-frontend`:

| command | result |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | pass, 0 errors |
| `npm run lint` (`eslint`, 4 GB heap) | pass: 0 errors, 138 warnings — all pre-existing and none in a file this change touched |
| `npx vitest run src/__tests__/flexibility-test-screen-protocol.test.tsx` | pass, 2 tests |
| `npm test` (full vitest suite) | see below |
| `npm run build` | see below |
| `npm run e2e` | not run — needs live app + DB + auth; cannot run in this environment |

Every deleted string was grepped across `src/__tests__` and `e2e` first: none was asserted by a
test. No ratchet test (`scale.test.ts`, `page-shell.test.ts`) needed updating — no class, size or
hero-title string changed.

## 6. Remaining issues / deferred

1. `npm run build` and the full `npm test` result are recorded below; e2e was not runnable here.
2. The member app and the public landing/`subscription` pages were audited but **not** edited:
   the flagged lines there are billing/status copy ("Every plan includes every feature",
   "Your clients, workouts, assessments and files are preserved whatever your plan status",
   trial-expiry wording) where the audit's duplication claim could not be re-verified in this
   session against the rendered page. Those strings are load-bearing on a money screen, so they
   were left alone rather than trimmed on suspicion.
3. Cross-tab repeats inside `clients/[id]` (see §3) are deliberate and documented, not missed.
4. The prose in the four AI generator pages is still generated-length in places; only the
   section captions were removed this pass.
