# Trainer's Daily Cockpit 2.0 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. (Execution method chosen by the user: native/inline — audit → plan → implement → test → review → fix → verify.)

**Goal:** Redesign the PT OS trainer dashboard (`/`, rendered by `components/dashboards/PtOsDashboard.tsx`) into an action-first glass cockpit: today's schedule, Next Best Action, client alerts, progress radar, business overview — mobile-first, premium, dark-mode-safe, zero backend changes.

**Architecture:** Composition + two new self-contained cards, reusing existing data end-to-end. Next Best Action promotes the #1 result of the already-tested `buildCoachInsights` rules engine (`src/lib/coach-insights.ts`); the AI Coach board below shows the remainder (`excludeTop` prop, default behaviour unchanged). Client alerts reuses the tested `RosterSignalsCard` (`api.pt.signals`). Progress radar reads `GET /api/progress/assessments` (tenant-scoped, `assessment_date DESC`, computed score columns) plus `GET /api/pt-os/clients` for the client name, and renders the existing `FitnessRadarChart`. No new endpoints, no mock data, no dependency additions.

**Tech Stack:** Next 16 App Router, React 19, Tailwind v3 (token classes + inline CSS vars), recharts (via `FitnessRadarChart`), framer-motion, vitest + Testing Library.

**Spec:** user brief (2026-10-17): priorities [today's schedule, Next Best Action, client alerts, progress radar, business overview]; keep existing APIs/data/auth/revenue logic/routes/integrations intact; no mock data; no breaking changes; mobile responsiveness; premium glassy UI; clear CTA components. Audit findings inline in each task.

## Global Constraints

- **Frontend repo only** (`619-erp-frontend`). No backend edits — `GET /api/progress/assessments` already returns `pa.*` with computed score columns, tenant-scoped, `ORDER BY assessment_date DESC`.
- **No new dependencies.** No mock data anywhere in shipped code.
- **Dark mode:** new UI uses existing tokens (`--bg-*`, `--text-*`, `--border`, `palette` from `@/lib/design`… as used in `PtOsDashboard.tsx`) — never hardcoded light surfaces. `Glass`/`.glass-panel` + tokens only.
- **Pinned contracts that must keep passing byte-compatibly:**
  - `dashboard-kpis.test.tsx` — exactly the tiles `Active Clients | PT Revenue | Active Share`; `KPI_TONES_FOR_TEST` keys `['activeShare','clients','revenue']`; no sparkline on Active Clients; no `informed-consent` request.
  - `session-hero-shape.test.ts` — hero radii/spacing source contract. **Do not change hero geometry**; surface polish only.
  - `today-screen-design.test.ts`, `today-queue.test.ts`, `today-sessions-card.test.tsx`, `screening-gaps.test.tsx`, `monthly-target.test.ts`, `ai-coach-card.test.tsx` (default path), `dashboard-error-state.test.tsx`, `page-shell.test.ts`, `quick-actions.test.ts`, `quick-dock-layout.test.tsx`, `start-without-programme.test.ts`.
  - `palette.test.ts` — `todayTheme` may be imported **by exactly** `components/dashboards/PtOsDashboard.tsx` (new files must not import it; new files must not import `fitnessTheme` either — that has its own confinement test).
- **Failure posture (house pattern):** every new card fails soft — fetch error ⇒ renders `null`, never takes the dashboard to the error boundary. `d`-gated sections stay `d`-gated.
- **Touch targets:** CTAs `h-11` (44px) minimum, `aria-label`ed, urgency shown in words + colour.
- **Component placement:** new files under `src/components/dashboards/cockpit/`; new tests under `src/__tests__/`.
- **No pushes/PR/merge** without explicit user authorisation (work stays on branch `feat/trainer-cockpit-2.0`).

## Review Focus

1. Radar row selection — first row may carry insufficient scores; expected: skip to the next scored row, never render a 1-point radar; if none, empty CTA state.
2. NBA CTA with zero reachable contacts — expected: "Open the list" button to `insight.href`, never a dead WhatsApp/Call button.
3. `excludeTop` emptying the AI Coach board — expected: honest "handled" strip, never the "seven days" all-clear (which would contradict the NBA card above).
4. New dashboard fetches failing (assessments / clients / signals) — expected: those sections vanish; schedule, KPIs, hero still render; no unhandled rejection.
5. Dark mode on the new cards — expected: token-driven surfaces, readable in both modes.

---

### Task 1: Shared fitness-score helpers (pure extraction, no behaviour change)

**Files:**
- Modify: `src/components/pt-os/fitness-testing/types.ts` (add `RadarDatum` import/type usage + `scoresFromAssessmentRow` + `radarDataFromScores`; relocate `FitnessScores` interface here if it currently lives in `FitnessDashboard.tsx`)
- Modify: `src/components/pt-os/fitness-testing/FitnessDashboard.tsx` (import the mapping instead of defining it; keep re-export `export type { FitnessScores }` if other files import it from here — check with grep first)
- Modify: `src/app/(chrome)/pt-os/assessment/page.tsx:89-99` (delete local `scoresFromRow`, import `scoresFromAssessmentRow`)
- Test: `src/__tests__/fitness-scores.test.ts`

**Interfaces:**
- Produces: `scoresFromAssessmentRow(row: Record<string, unknown>): FitnessScores` — numeric-strings coerced, missing/invalid → `null` (mirrors assessment page L85-99: `cardio_score_computed`, `strength_score_computed`, `endurance_score_computed`, `mobility_score_computed`, `body_composition_score`, `health_risk_score`, `overall_fitness_score`).
- Produces: `radarDataFromScores(s: FitnessScores): RadarDatum[]` — same category order the dashboard/assessment screens already render (copy the existing array out of `FitnessDashboard.tsx` verbatim), `null` passthrough (never 0).

- [ ] **Step 1: Write the failing test** — `fitness-scores.test.ts`: numeric strings → numbers; `undefined`/`''`/`'abc'` → `null`; radar mapping returns the 6 categories in the existing order with nulls preserved.
- [ ] **Step 2: Run it — expect FAIL** (`scoresFromAssessmentRow is not a function`): `npx vitest run src/__tests__/fitness-scores.test.ts`
- [ ] **Step 3: Implement** the two functions in `fitness-testing/types.ts`; update `FitnessDashboard.tsx` and the assessment page to consume them (no visual/behavioural change).
- [ ] **Step 4: Verify** — new test PASS **and** the fitness suite still green: `npx vitest run src/__tests__/fitness-scores.test.ts src/__tests__/fitness-dashboard.test.tsx src/__tests__/assessment-*.test.*` (exact filenames: list `src/__tests__/` matching `fitness|assessment`).
- [ ] **Step 5: Commit** — `refactor(pt-os): share assessment score + radar mapping helpers`

### Task 2: `NextBestActionCard`

**Files:**
- Create: `src/components/dashboards/cockpit/NextBestActionCard.tsx`
- Modify: `src/components/dashboards/PtOsDashboard.tsx` (render after `<ScreeningGaps />`, before `MobileQuickActions`; same props the `AICoach` call already passes)
- Test: `src/__tests__/cockpit-next-best-action.test.tsx`

**Interfaces:**
- Props: `{ d: DashData; ops: OpsData | null; birthdays: CoachBirthday[]; studioName: string }` (identical to `AICoach`'s).
- Builds insights with `buildCoachInsights` using the exact input mapping from `AICoach` (PtOsDashboard L1384-1400). Renders the **top insight** (`insights[0]`) as a glass hero card: eyebrow "NEXT BEST ACTION", urgency in words + colour, title, detail, count.
- CTA row (`h-11`): WhatsApp (prefilled `whatsappLink(next, selected.message(next.name))`, `window.open` `_blank` `noopener,noreferrer`, advances a local cursor over `reachable(contacts)`), Call (`telLink`), and a secondary "Open list" link to `insight.href` — always present. `remaining/total` label to its left (reuse wording style "2 of 3 left" / "All contacted").
- Zero reachable contacts ⇒ Open-list is the **only** CTA (Review Focus #2). No insights ⇒ `return null` (AICoach all-clear covers this state).
- Urgency tones mirror `AICoach`'s `TONE` map (red/amber/blue, words "Urgent/Soon/Nice to do").

- [ ] **Step 1: Write failing tests** — fixtures produce a known top insight (e.g. 1 expired package + 1 birthday ⇒ `expiring`/`expired` critical on top): expect the top insight's title rendered, lower insight's title absent; WhatsApp `href^="https://wa.me/"` with URL-encoded name; Call `href^="tel:"`; contacts with no mobile ⇒ no WhatsApp/Call, one "Open list" button pointing at `insight.href`; empty inputs ⇒ container renders nothing.
- [ ] **Step 2: Run — expect FAIL**: `npx vitest run src/__tests__/cockpit-next-best-action.test.tsx`
- [ ] **Step 3: Implement** the component; mount it in `PtOsDashboard` after `ScreeningGaps`.
- [ ] **Step 4: Verify** — new tests PASS; `dashboard-kpis.test.tsx` + `dashboard-error-state.test.tsx` still PASS (new card must fail soft when `ops`/`birthdays` are absent, Review Focus #4).
- [ ] **Step 5: Commit** — `feat(cockpit): next best action hero card`

### Task 3: `AICoach` gains `excludeTop` (default untouched)

**Files:**
- Modify: `src/components/dashboards/PtOsDashboard.tsx` (`AICoach` L1375-1610: new optional prop; slice before **all** uses — badge count, `done`, selection; PtOsDashboard root passes `excludeTop`)
- Test: `src/__tests__/ai-coach-card.test.tsx` (append cases)

**Interfaces:**
- `AICoach({ d, ops, birthdays, studioName, excludeTop }: { …; excludeTop?: boolean })` — falsy ⇒ current behaviour byte-identical.
- `excludeTop` + insights exist ⇒ shown = `insights.slice(1)`; badge, radiogroup, selection, and `done` all use `shown`. `excludeTop` + `shown.length === 0` + `insights.length > 0` ⇒ compact strip: shield icon + "Everything's handled above." (NOT the "seven days" all-clear — Review Focus #3).

- [ ] **Step 1: Write failing tests** (append): with 2 insights + `excludeTop` ⇒ badge shows 1, only the second insight's title present; with 1 insight + `excludeTop` ⇒ strip text present, "No expiries, dues or birthdays in the next seven days." absent; existing default-path tests unchanged and still passing.
- [ ] **Step 2: Run — expect FAIL** on the new cases only: `npx vitest run src/__tests__/ai-coach-card.test.tsx`
- [ ] **Step 3: Implement** the prop; pass `excludeTop` from the PT dashboard root.
- [ ] **Step 4: Verify** — file fully green.
- [ ] **Step 5: Commit** — `feat(cockpit): ai coach board shows the remainder after the nba card`

### Task 4: Client alerts on the cockpit

**Files:**
- Modify: `src/components/dashboards/PtOsDashboard.tsx` (new section after the AI Coach: `<SectionLabel>Client Alerts</SectionLabel>` + `<RosterSignalsCard />`)
- Test: `src/__tests__/cockpit-layout.test.tsx` (new)

**Interfaces:**
- Consumes: existing `RosterSignalsCard` (`src/components/pt-os/RosterSignalsCard.tsx`, self-fetching via `api.pt.signals`, already tested by `roster-signals.test.tsx`) — do not modify it.

- [ ] **Step 1: Write failing test** — render `PtOsDashboard` with the standard http mock: DOM heading order is `Today's Sessions → Next Best Action → AI Coach → Client Alerts → Progress Radar → This Month → Key Metrics` (assert via `getAllByRole('heading')`/section order, not source text); with `/api/pt-os/signals` rejecting ⇒ Client Alerts absent, KPIs + hero still present (Review Focus #4).
- [ ] **Step 2: Run — expect FAIL** (no Client Alerts section): `npx vitest run src/__tests__/cockpit-layout.test.tsx`
- [ ] **Step 3: Implement** the mounting in the root render, in the order above.
- [ ] **Step 4: Verify** — new test PASS; `roster-signals.test.tsx` untouched and PASS.
- [ ] **Step 5: Commit** — `feat(cockpit): client alerts section`

### Task 5: `ProgressRadarCard`

**Files:**
- Create: `src/components/dashboards/cockpit/ProgressRadarCard.tsx`
- Modify: `src/components/dashboards/PtOsDashboard.tsx` (section `<SectionLabel>Progress Radar</SectionLabel>` + card, after Client Alerts)
- Test: `src/__tests__/progress-radar-card.test.tsx`

**Interfaces:**
- Self-fetching (house pattern — `http` from `@/lib/http`, `useAsync` from `@/lib/use-async`): `GET /api/progress/assessments?limit=6` and `GET /api/pt-os/clients`.
- Row pick: first row where ≥3 of the 6 sub-scores are non-null, else first row with `overall_fitness_score` — never a <3-point radar (Review Focus #1). Date shown from `assessment_date`.
- Name: `clients` row matched by `client_id` ⇒ name (+ avatar initial); unmatched ⇒ omit name, keep date + link.
- "Today" chip when `client_id` appears in ops today data — **skip in v1** (ops is a prop; card stays standalone: no prop, no chip). CTA: "View assessment" → `/pt-os/assessment?client_id={id}`.
- `FitnessRadarChart variant="onCard"` with `radarDataFromScores(scoresFromAssessmentRow(row))`, plus overall score line.
- Empty studio (no scored rows) ⇒ glass empty state: "No fitness tests yet" + `HeroButton`-style CTA to `/pt-os/assessment`. Any fetch error ⇒ `null` (Review Focus #4).
- Dark mode: tokens only (`currentColor` label fill comes free from `onCard`) — Review Focus #5 pinned by a test asserting no hardcoded `#fff`/`rgba(255,255,255` in the card's style output? (assert via rendered style attrs where feasible, else a source-free DOM check: card container has no `background:#fff` inline style).

- [ ] **Step 1: Write failing tests** — mocked `http`: (a) picks the first row with ≥3 subscores even when a sparser row is newer; (b) renders 6 category labels in the standard order; (c) name resolved from clients map; (d) rows-with-no-scores ⇒ empty-state CTA with `href^="/pt-os/assessment"`; (e) assessments rejecting ⇒ nothing rendered.
- [ ] **Step 2: Run — expect FAIL**: `npx vitest run src/__tests__/progress-radar-card.test.tsx`
- [ ] **Step 3: Implement** the card; mount the section.
- [ ] **Step 4: Verify** — new tests PASS; `cockpit-layout.test.tsx` (order incl. Progress Radar) PASS.
- [ ] **Step 5: Commit** — `feat(cockpit): progress radar card`

### Task 6: Glass polish + mobile rhythm (light touch)

**Files:**
- Modify: `src/components/dashboards/PtOsDashboard.tsx` (hero surface overlay only — **geometry unchanged**; ambient wash refresh; section labels get a small icon chip consistent with `PageHero`'s icon chip; NBA/radar/alerts spacing aligned on the existing `space-y` rhythm)
- Test: rely on `session-hero-shape.test.ts` + `dashboard-kpis.test.tsx` + `cockpit-layout.test.tsx` (no new file; if a pinned assertion legitimately encodes a surface detail being changed, update it deliberately in the same commit and say so in the message)

- [ ] **Step 1: Baseline run** — `npx vitest run src/__tests__/session-hero-shape.test.ts src/__tests__/dashboard-kpis.test.tsx src/__tests__/cockpit-layout.test.tsx` (record PASS state).
- [ ] **Step 2: Implement** the surface polish (glass overlays/shadows/icon chips; no spacing/radius geometry changes to the hero).
- [ ] **Step 3: Verify** — same three files still PASS, unchanged (if not: revert the offending style, don't touch the test).
- [ ] **Step 4: Commit** — `style(cockpit): glass polish and section rhythm`

### Task 7: Full gate run, review, fix, verify (process task)

- [ ] **Step 1:** Full frontend gates: `npx tsc --noEmit`; `npx eslint` on changed files; `npx vitest run` (whole suite — known pre-existing failure: `schedule-session-confirm.test.tsx`, count it, don't fix); `npm run build` (production build).
- [ ] **Step 2:** Dispatch a fresh `reviewer` subagent over `git diff origin/main...HEAD` with the Review Focus list; collect findings.
- [ ] **Step 3:** Fix confirmed findings; re-run the gates they touch.
- [ ] **Step 4:** Report: branch, commits, gate evidence, anything skipped. Push/PR only on explicit user authorisation.

---

## Self-review notes

- Spec coverage: schedule (kept, top position) ✓; NBA (T2) ✓; alerts (T4) ✓; radar (T5) ✓; business overview (kept: MonthlyTarget + KPI grid + TodayRevenue; untouched content, existing order) ✓; mobile (order + h-11 + existing mobile blocks) ✓; glassy (T2/T5/T6 + existing Glass) ✓; CTAs (T2/T5) ✓; no breaking changes (pinned-contract list + fail-soft) ✓; no mock data (T1/T5 read real endpoints) ✓.
- Deliberately out of scope (do-not-build): any LLM call on the dashboard (60s-poll screen ⇒ cost per load; the existing engines are deterministic and already branded as AI), new backend endpoints, restyling every legacy card wholesale (risk >> gain; revisit on user feedback), `today` client chip on the radar (v1).
- Known dependency: Task 5 consumes Task 1's helpers; Tasks 2-4 independent.
