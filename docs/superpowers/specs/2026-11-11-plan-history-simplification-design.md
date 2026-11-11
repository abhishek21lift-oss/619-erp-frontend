# Plan version card → quiet "History" row (2026-11-11)

## Why

The builder's bottom card read **"Version 2 / View history"** with a filled
brand button **"Save this version"**. Two problems:

- The plan already autosaves, so "Save this version" reads as "save the plan"
  — an action that already happened. What the button actually does is freeze an
  archived copy.
- A filled brand button at the bottom competes with the screen's real primary
  action (Add exercise), for something a trainer does a few times a year.

"Version 2" is a database counter; a trainer has no use for it as a headline.

## Decision

Keep the feature and the card shape (it matches the Progression row directly
above it), but demote it to a quiet row. Chosen option B of three:

- A — copy-only rename inside the old card. Still a filled button; rejected.
- **B — quiet row, no version number, plain text action. Chosen.**
- C — move to the plan detail page. The trainer is in the builder when they
  think "save this before I rewrite it"; rejected.

## Design

```
┌────────────────────────────────────────────────┐
│ 🕘 HISTORY                                      │
│    Older copies of this plan   ⌄   Save to history │
└────────────────────────────────────────────────┘
```

- Disclosure button (left): `History` eyebrow, summary "Older copies", rotating
  chevron — same pattern as `ProgressionRule`.
- Action (right): **Save to history**, brand-coloured text button, 44px target.
  No gradient, no fill.
- Expanded list rows: date as the primary line; "4 exercises · Ravi" muted.
  Version numbers are no longer shown anywhere in the UI.
- Empty state: "Nothing saved yet. Save before a big rewrite and you can always
  look back at what the plan used to say."
- Toast on save: "Saved to history" (frontend copy; API untouched).
- Fetch-on-expand behaviour and `beforeSave` flush are unchanged.

## Non-goals

- No count badge (would need a request on every builder open).
- No opening/restoring a snapshot — the history list is metadata only today;
  that gap is separate work.
- No backend change: `POST /plans/:id/versions` and its message stay as they are.

## Files

- `src/components/pt-os/builder/PlanVersions.tsx` (only code file)
