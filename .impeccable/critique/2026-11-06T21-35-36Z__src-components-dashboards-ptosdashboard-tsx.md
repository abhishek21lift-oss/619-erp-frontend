---
target: mobile studio dashboard (screenshots 2026-11-07)
total_score: 15
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 4
target_identity: "file:/home/oem/Desktop/myptstudio/619-erp-frontend/src/components/dashboards/PtOsDashboard.tsx"
target_fingerprint: "sha256:12febc404fc10b1bec50a957b67d842fd9d6e0b2830d53bb485780a8fc138df6"
target_path: /home/oem/Desktop/myptstudio/619-erp-frontend/src/components/dashboards/PtOsDashboard.tsx
timestamp: 2026-11-06T21-35-36Z
slug: src-components-dashboards-ptosdashboard-tsx
---
# Critique — Studio dashboard (mobile, captured 2026-11-07 01:51)

**Target:** `src/components/dashboards/PtOsDashboard.tsx` (rendered `/` on a 390px phone)
**Method:** isolated design review + deterministic scan (Assessment B's subagent hit the free-model limit; the report was synthesised in the parent, then corrected by the isolated pass).
**Build drift:** the five screenshots show the pre-chapter layout (horizontal Quick Actions strip, eyebrow section labels, money cards scattered). HEAD already wraps the body in Today / Money / People chapters (`e8d8d3a7`, 2026-11-05). Issues marked **[fixed on HEAD]** below are already addressed there; the rest still apply.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | "0/1", "unbooked", "Nothing else to review" and "1 TO CALL" describe the same one client in four vocabularies. |
| 2 | Match System / Real World | 2 | "swept", "Saved time", "unbooked", "Active Share", "true renewal" are internal language. |
| 3 | User Control and Freedom | 2 | Clear nav and back paths; no dismiss, snooze or compact mode for the empty modules. |
| 4 | Consistency and Standards | 1 | One fact gets three labels; 5 accent hues with no semantic rule; "View all", chevrons and pills all mean "go". |
| 5 | Error Prevention | 2 | WhatsApp/Call offered at 1:51 AM with no quiet-hours guard; the contact cursor advances before anything is sent. |
| 6 | Recognition Rather Than Recall | 1 | 11 unlabelled-in-context assessment tiles, 9–10px labels, 6+ hidden off-screen; "Overall 42" has no scale. |
| 7 | Flexibility and Efficiency | 2 | No schedule-session or record-payment accelerator; no bulk; one client repeated four times. |
| 8 | Aesthetic and Minimalist Design | 1 | ~3 of 5 screens are zero/empty states at full card size; every card competes at the same weight. |
| 9 | Error Recovery | 1 | "1 client could not be assessed at all" is a dead end with no "log it" action. |
| 10 | Help and Documentation | 1 | Nothing explains "Soon", "swept", "Overall 42", "1 of 1 left", or "NIGHT OWL". |
| **Total** | | **15/40** | **Poor — informative in aggregate, unreliable at the point of decision.** |

Scores revised after an isolated design-review pass; the first parent-only table scored 22/40 because it did not catch the two contradictions below.

## Design Specificity Verdict

**LLM assessment:** The cover is authored — gold crest, "Night Owl", film grain, bevel, warm rim light. Everything below it is a category-generic gym dashboard: icon + title + number + progress bar, repeated. A competitor could swap their logo into the body unchanged. The one product-specific idea (the roster insight engine) is buried under four cards that all talk about the same single client.

**Deterministic scan:** `impeccable detect --json` returned `[]` (exit 0) on `PtOsDashboard.tsx`, `components/dashboards/cockpit`, and `RosterSignalsCard.tsx`. That is not a clean bill: file-mode detection is regex-based and does not evaluate inline-style gradients, computed contrast, or 390px layout. The contrast failures below were measured from the source hex values by hand.

**Browser overlays:** none. No local server for this Next app is running; the supplied screenshots are the visual record.

## Overall Impression

A premium-looking surface that behaves like a monthly report instead of a cockpit for the next hour. At 1:51 AM, with one client and zero revenue, the screen spends four of five viewports repeating "Amit" and rendering empty cards, while the two numbers a trainer opens the app for — what is booked and what came in — are spread across screens 1, 3, 4 and 5. The biggest opportunity is not more polish; it is ruthless prioritisation of one "now" surface.

## What's Working

- **The hero is genuinely crafted.** The single light source, gold coin, grain and bevel read as a lit object, not a gradient rectangle. It gives the product a face.
- **The schedule row is scannable.** Time first, avatar, name, "Next" badge, and a single Start affordance is the right order for a trainer standing between clients.
- **The bottom bar is honest.** Five labelled tabs, 46px height, 44px targets, a clear active pill, and a real `aria-label`; it is the most usable element on the screen.

## Priority Issues

### [P0] The dashboard contradicts itself about its only client

**What:** "Today's Sessions" shows `0/1`, `9:00 AM`, `NEXT`, `Amit Shukla` and a "Start" chip. Next Best Action, immediately below, says "1 client due to train, unbooked" about the same 9:00 row — and says so at the same time. `TodaySchedule` reads `/api/pt-os/workout-log/today`, whose roster includes programme-only days; `coach-insights.ts` takes those same roster rows and calls them "unbooked." Each card is internally correct; together they are incoherent. "Start" was also never a start control on a programme row — the whole row routes to `/pt-os/today`.
**Why it matters:** The dashboard's only job is to be trusted at the moment of decision. With one client, it presents at least three truths about him.
**Fix:** one server-derived state per client per day, labelled honestly ("Booked 9:00 AM" vs "Programme day · not booked"); Start only on a booking; a regression test that a client cannot be both. **Fixed in this pass.**

### [P0] A client-facing message is one tap away at 1:51 AM, and the app counts it as done

**What:** WhatsApp and Call open pre-filled with no quiet-hours guard and no confirmation. Both the Next Best Action card and the AI Coach board advanced their contact cursor on click, before anything was sent — so backing out of WhatsApp could still end at "Everyone on this list has been contacted."
**Why it matters:** Messaging a client at 2 AM damages the relationship the product exists to protect; a false "contacted" state skips the next client, with no undo.
**Fix:** advance only after an explicit "Yes, next"; the sent-message action is now a single confirmation step. **Confirmation fixed in this pass; quiet hours are still open.**

### [P1] The same client is the subject of four cards
**What:** Amit Shukla appears in Today's Sessions ("Next"), Next Best Action ("1 client due to train"), Who to call ("1 TO CALL"), and Progress Radar. Two cards offer WhatsApp/Call for him, a third offers Start, a fourth shows his fitness test. With one client, this is the entire dashboard saying the same thing four ways.
**Why it matters:** The trainer cannot tell which card is the real next step, and the repetition makes a one-client studio feel busier than it is. It also hides the fact that there is nothing else to do.
**Fix:** One client-task card that owns the next action (book / start / message), and a roster list that hides the promoted client. Move the radar to the client profile; on the dashboard show a roster-level baseline or nothing.
**Command:** `/impeccable distill`

### [P1] The page is a report, not a cockpit
**What:** ~11 modules across roughly five phone viewports. Four of them are zero-value at capture time (AI Coach "Nothing else to review", "No target", "No renewals", "₹0 / ₹0 revenue"). Money does not appear until screen 3; today's revenue until screen 4.
**Why it matters:** The first two screens decide whether the app feels useful. Here they are a brand cover, one session, one action, and an empty AI card. The trainer scrolls past "nothing" to reach the numbers.
**Fix:** Collapse every all-clear/zero module to a one-line status strip; cap the first viewport at hero (compact) + next action + today's money; put a single "Today: ₹0 collected · ₹0 pending · 0/1 done" strip near the top. Hide "This month" until a target exists.
**Command:** `/impeccable layout` then `/impeccable distill`
**[partly fixed on HEAD]** Money cards are grouped under a Money chapter, but the empty-card cost and the long scroll remain.

### [P1] Small type and failing contrast
**What:** Informational labels run at 8–10px ("BY TRAINER", "COLLECTED TODAY", "LAST MO.", "KEY METRICS", bottom-nav labels). Measured AA failures: white on emerald-500→600 = **2.54–3.77:1** (Send WhatsApp); amber-600 on its 9% wash = **2.90:1** ("Soon"); white on the indigo-400→600 Start gradient = **2.98:1** at the light end.
**Why it matters:** These are the primary action and status labels. At 12.5px bold they are not "large text", so 4.5:1 applies and they fail — worst for the low-vision and bright-sunlight cases this app will actually meet.
**Fix:** End the gradients at a 600/700 stop (emerald-700, rose-600, indigo-600) or use dark ink on the light end; move amber chips to `--warning-text` amber-800 on a lighter wash; raise informational labels to at least 11px and cut the 8px tier.
**Command:** `/impeccable audit` then `/impeccable polish`

### [P1] Copy is written for the system, not the trainer
**What:** "Saved time", "1 client due to train, unbooked", "2 swept · 1 to call", "1 client could not be assessed at all — nothing logged to read", "Active Share 100% · 1 of 1 still active · true renewal on Insights", "0✓", "LAST MO.", "0%" without a denominator. And the two outreach CTAs are shown at 1:51 AM.
**Why it matters:** Every one of these forces a translation step, and "0✓" next to the only trainer while the card says "5 done" reads as a data bug. Messaging a client at 2 AM is a real-world harm the UI actively invites.
**Fix:** Use trainer words ("usual time", "not booked", "3 clients checked · 1 needs a call"), spell out "Last month", label the trainer row "sessions completed", and gate WhatsApp/Call behind a quiet-hours notice or schedule-for-morning action.
**Command:** `/impeccable clarify`

### [P2] Quick Actions are an assessment catalogue, not quick actions
**What:** 11 tiles; 10 are intake/assessment (Consent, PAR-Q, Interview, Fitness, Goal, Lifestyle, Nutrition, Mobility, Posture, Strength). The daily operations — Schedule session, Record payment — are absent. The captured strip shows 4.5 tiles and hides the rest with no scroll cue.
**Why it matters:** The most repeated daily jobs are two taps deeper than the monthly ones, and the hidden 6 tiles are undiscoverable on a phone.
**Fix:** Five or six daily actions in one visible row; move the assessment set behind one "Assessments" tile or a sheet. Add Schedule session and Record payment.
**Command:** `/impeccable distill`

## Persona Red Flags

**Alex (power user):** No Schedule session or Record payment shortcut; 11 tiles to scan; the same client repeated; no way to jump from "1 to call" to a call queue. Will ignore the dashboard and go straight to Clients.

**Casey (distracted mobile):** The next action is below the hero and a session card; the useful money number is four screens down; 8–10px labels are hard to read one-handed; the page loses context after an interruption because there is no "resume" state. The 1:51 AM WhatsApp CTA is exactly the wrong tap to offer a half-asleep user.

**Sam (screen reader/keyboard):** "0✓", "2 swept", and "↗150%" are read without units; the radar needs its text alternative (chart system has one, but this card's summary "Overall 42" is not explained); the four duplicate client cards create four announcements of the same person; tiny 8px labels are visual-only cues for sighted low-vision users.

## Minor Observations

- The wordmark breaks as "ABHISHEK PT" / "STUDIO", leaving one word alone on the second line; at 390px it should be one line or a deliberate two-line lockup.
- "Active Share 100%" with n=1 is a vanity metric; hide share/renewal figures below a small cohort.
- The "No renewals this week" empty state is ~200px tall for a one-line fact.
- "Today's Revenue" renders two 0% bars and two zero rows for ₹0; one line would say it.
- "This month" is an empty state styled as a full section; it should be a compact "Set a target" CTA.
- The bottom nav is dark navy while the body is light rose; it reads as a third visual world alongside the hero and the cards.
- Five accent hues are in play (rose, gold, emerald, amber, indigo) plus the navy; colour no longer reliably means one thing (green = revenue, success, and sessions).
- The capture shows a persistent scrollbar on a phone-sized viewport; if that is the shipping build, it is an emulator artifact, not an iOS pattern.
- "Check-in" (QR attendance) and "Sessions" are adjacent in the nav; first-timers may read both as the schedule.

## Questions to Consider

- If the screen could show only three things at 1:51 AM, which three would change what the trainer does next?
- Is the hero earning its 230px every time the app opens, or is it a cover the trainer learns to scroll past?
- What would a one-client studio's dashboard look like if it were designed for that state first, instead of the 40-client state with empty fallbacks?
