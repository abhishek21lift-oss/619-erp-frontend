# Full-Stack Audit — 619 ERP (Frontend · Backend · Supabase · Cloudflare)

**Date:** 2026-07-25
**Scope:** `619-erp-frontend` (Next.js 16.2.6 / React 19), `619-erp-backend` (Express + node-postgres), the live Supabase project `619-erp` (`adffjnztzrolibtuvhgc`, Postgres 17.6, ap-south-1), and Cloudflare R2 object storage.

Every finding below was verified against a primary source — live SQL against the production database, the Supabase security/performance linter, or traced code paths. Findings are separated from things I could not verify; see **Coverage & Limitations** at the end before treating this as complete.

---

## Executive summary

The application layer is in better shape than most codebases this size: 125 of 130 public tables carry deny-all RLS policies, auth uses httpOnly cookies with rotating refresh tokens, rate limiting is layered (IP + per-user + per-endpoint), CORS is an explicit allowlist, and no secrets are tracked in git. The serious problems are concentrated at the **infrastructure seams** — where the app's own migration runner diverges from Supabase's, where uploaded files cross into Cloudflare R2, and where a newly-added feature skipped an established convention.

| Area | Verdict |
|---|---|
| Database RLS / tenant isolation | **5 tables fully exposed** — otherwise consistently hardened (125/130) |
| Migration integrity | **Two competing migration systems, 34 versions out of sync** |
| File storage (Cloudflare R2) | **Unauthenticated reads + silent-data-loss failure mode** |
| Frontend security headers | Sound design; one stale allowlist breaks a feature |
| Backend auth / CORS / rate limits | Solid |
| Secrets hygiene | Clean, with one unnecessary key requested |

---

## CRITICAL

### C1. Five tables have RLS disabled *and* full `anon` write grants
**Where:** live DB, `public` schema. Introduced by `src/db/migrations/099_subscription_foundation.sql`.

Verified by direct query against `pg_class` / `information_schema.role_table_grants`:

| Table | RLS | Policies | `anon` privileges | Rows |
|---|---|---|---|---|
| `subscription_plans` | **off** | 0 | SELECT, INSERT, UPDATE, DELETE, TRUNCATE | 4 |
| `subscription_payments` | **off** | 0 | SELECT, INSERT, UPDATE, DELETE, TRUNCATE | 0 |
| `subscription_invoices` | **off** | 0 | SELECT, INSERT, UPDATE, DELETE, TRUNCATE | 0 |
| `subscription_events` | **off** | 0 | SELECT, INSERT, UPDATE, DELETE, TRUNCATE | 2 |
| `founder_members` | **off** | 0 | SELECT, INSERT, UPDATE, DELETE, TRUNCATE | 0 |

Supabase's own linter flags all five at **ERROR** level (`rls_disabled_in_public`, facing `EXTERNAL`).

This directly violates the convention the codebase established for itself. Migration `059_audit_security_hardening.sql` states: *"the backend connects with a role that bypasses RLS, so enabling RLS + a deny-all policy for anon/authenticated closes the Data-API hole"*, and `090_organizations_enable_rls.sql` says *"Every other app table already carries a deny-all RLS policy."* That is true — 125 of 130 tables comply. The subscription/billing feature, the newest addition, is the exception.

Because the grants include `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE` — not just `SELECT` — the exposure is not merely a data leak. It permits **rewriting billing plan pricing and truncating the plan table**, which drives subscription enforcement (`lib/subscription.js`, the 402 `SUBSCRIPTION_INACTIVE` gate).

**Precondition, stated honestly:** exploiting this requires the project's `anon` key. That key is **not** shipped in either repo — the frontend does not depend on `@supabase/supabase-js` and talks only to the Express backend. But an `anon`/publishable key is public *by design* in Supabase's model (it is not a secret, it is handed out to any browser client and is visible in the dashboard to anyone with project access). Treating "the anon key isn't published yet" as the control is exactly the assumption migrations 059/090 were written to eliminate. I could not confirm live reachability of the Data API from this sandbox (see Limitations).

**Fix** — bring these five in line with the other 125:

```sql
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'subscription_plans','subscription_payments','subscription_invoices',
    'subscription_events','founder_members'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS deny_all_direct_access ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY deny_all_direct_access ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', t);
  END LOOP;
END $$;
```

The Express backend connects as a `BYPASSRLS` role and is unaffected. Consider also `REVOKE ALL ON ... FROM anon, authenticated` as defence in depth, and add an RLS assertion to CI so migration 100+ cannot regress this again.

---

## HIGH

### H1. Two migration systems, 34 versions out of sync
**Where:** `src/db/migrate.js` (`public._migrations`) vs. Supabase's `supabase_migrations.schema_migrations`.

| Tracker | Migrations recorded | Latest |
|---|---|---|
| App runner (`_migrations`) | **112** | `staff.sql` |
| Supabase history | **31** | `078_multitenancy_foundation` |

The app has applied through `099_subscription_foundation`; Supabase's tooling believes the schema stops at `078`. Anything that reads Supabase's history — `supabase db diff`, `db reset`, database branching, the dashboard's migration view — operates on a **34-migration-stale picture of production**. A `db reset` or branch created today would rebuild a schema missing multitenancy follow-ups, the entire subscription feature, and more.

This is also the root cause of C1: `099` was applied by the app's own runner and never passed through the Supabase path where the linter would have flagged the missing RLS immediately.

**Fix:** pick one system as authoritative. Either repair Supabase's history (`supabase migration repair --status applied <version>` for the missing entries) so both agree, or explicitly disable Supabase-side migration tooling for this project and document that `src/db/migrate.js` is canonical. Do not leave both live.

### H2. `/uploads/*` serves health and consent records with no authentication
**Where:** `src/server.js:145` → `src/routes/uploads.js`

```js
app.use('/uploads', require('./routes/uploads'));   // no `auth` middleware
```

Every other data route in the app is mounted behind `auth`. This one is not, and it is the read path for everything written via `lib/fileStorage.js`:

- `parq/pdf/<uuid>.pdf` — PAR-Q health screening questionnaires (`lib/parqPdf.js:98`)
- `informed-consent/pdf/<uuid>.pdf` — signed consent forms (`lib/informedConsentPdf.js:118`)
- `profile/…`, `org-logos/…` — avatars and branding

PAR-Q responses are medical fitness-to-exercise data — GDPR Article 9 special-category. The backend already takes Art. 9 seriously elsewhere: `server.js` emits a startup warning that unencrypted face descriptors "violate GDPR Art. 9." Serving health PDFs with no authorization check at all is inconsistent with that posture.

Keys are row UUIDs, so URLs are not enumerable in practice — that is the mitigating factor, and it is why this is High rather than Critical. But it is obscurity, not authorization: there is no access check, no expiry, and no revocation. A URL that escapes via referrer header, a shared link, log aggregation, browser history, or a cached CDN response grants permanent access to that individual's health record.

**Fix:** put `auth` on the mount and authorize by record ownership (client's own record, their trainer, or admin). If direct links are genuinely needed, issue short-lived signed URLs (R2 presigned GETs) instead of permanent unauthenticated paths.

### H3. Missing R2 configuration silently destroys all uploaded files
**Where:** `src/lib/fileStorage.js:14-16`, `src/server.js:16-40`

```js
function isR2Configured() {
  return Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
}
```

If any one of the three is missing, `saveFile()` falls back to local disk without complaint. The file's own header comment states the consequence: *"Render's filesystem is ephemeral — everything under uploads/ is wiped on every deploy/restart — so production must use R2."*

That requirement is documented but **not enforced anywhere**. `R2_*` appears in neither `REQUIRED_ENV` nor `RECOMMENDED_ENV` in `server.js`, and it is commented out in `.env.example`. So a production deploy with a typo'd or absent R2 credential starts cleanly, logs nothing, serves correctly — and silently discards every consent PDF, PAR-Q form, and avatar on the next deploy. The failure is invisible until someone needs a signed consent form that no longer exists.

Note the inconsistency: `FACE_ENCRYPTION_KEY` gets an explicit production warning; the R2 credentials, whose absence causes irreversible data loss, get none.

**Fix:** in production, fail fast (or at minimum warn loudly) when `isR2Configured()` is false. Partial configuration — one or two of the three set — should be a hard startup error, since it always indicates a mistake.

---

## MEDIUM

### M1. CSP blocks the spreadsheet-import feature outright
**Where:** `src/lib/sheet-import.ts:17-18,128-136` vs `src/proxy.ts:60`

The importer injects a script tag:
```js
s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
```
The active CSP is:
```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com/gsi/
```
`cdnjs.cloudflare.com` is absent, so the browser refuses to load SheetJS and member import via spreadsheet fails wherever the CSP applies (i.e. production). Tellingly, `connect-src` allows `https://cdn.jsdelivr.net` — a *different* CDN — which suggests the script URL was migrated to cdnjs without updating the policy (and `connect-src` would not authorize a script tag regardless; `script-src` governs it).

Good practice already present: the tag sets `crossOrigin` and a SHA-512 `integrity` hash.

**Fix:** add `https://cdnjs.cloudflare.com` to `script-src` (and drop the now-unused jsdelivr entry from `connect-src`), or better — see M2 — vendor the library locally and remove the third-party origin entirely.

### M2. Pinned `xlsx@0.18.5` carries known CVEs and parses untrusted input
Version 0.18.5 is affected by prototype-pollution (CVE-2023-30533, fixed in 0.19.3) and ReDoS (CVE-2024-22363, fixed in 0.20.2). This library parses **user-supplied spreadsheets** in the browser, which is precisely the exposed path for both. The SRI pin controls supply-chain tampering but locks in the vulnerable version — and cdnjs does not host a fixed release, since SheetJS left the public npm registry after 0.18.5.

**Fix:** install from the vendor's registry (`https://cdn.sheetjs.com/`) at ≥0.20.2 and self-host the asset, which resolves M1 and M2 together.

### M3. Ops are asked to provision an unused service-role key
**Where:** `src/server.js:32-33`

`SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are listed in `RECOMMENDED_ENV` and produce a startup warning when unset — but a grep across the entire backend shows **no code reads either variable**. The app reaches Postgres exclusively through `DATABASE_URL` / `pg`.

A `service_role` key bypasses RLS completely. Prompting operators to create and store one that nothing consumes is pure downside: another high-value credential in the environment, in deploy configs, and in whatever secret store is used.

**Fix:** delete both entries from `RECOMMENDED_ENV`.

### M4. `trust proxy: 1` may be wrong for the deployed topology
**Where:** `src/server.js:67-68` — `app.set('trust proxy', 1)`, with the comment "Behind Render / Vercel / Cloudflare."

`1` trusts exactly one proxy hop. If traffic actually flows Cloudflare → Render → app (two hops), `req.ip` resolves to an infrastructure address rather than the client's, which would bucket **all** users into shared rate-limit keys — degrading `apiLimiter`, `loginLimiter`, and `registerLimiter` simultaneously, and weakening brute-force protection on login.

I could not confirm the live topology from here, so this is flagged for verification rather than asserted as broken. **Check:** log `req.ip` in production and confirm it matches real client addresses; set the hop count to match.

### M5. Database performance hygiene (from the Supabase linter)
- **14 unindexed foreign keys**, including `subscription_invoices.payment_id`, `subscription_invoices.plan_code`, `subscription_payments.plan_code`, `organizations.plan_code`, and three on `workout_sessions`.
- **4 RLS policies re-evaluate `current_setting()`/`auth.*()` per row** (`webauthn_credentials`, `gym_settings`, `biometric_attendance`, `webauthn_challenges`) — wrap in `(select …)` to make them InitPlan-cached.
- **1 duplicate index**: `exercises` has both `exercises_body_part_idx` and `idx_exercises_body_part`; drop one.

*Deliberately discounted:* the linter also reports **232 "unused index"** warnings. With the current data volume (10 `pt_clients`, 4 `users`, 3 `organizations`) essentially no index would register usage, so these are noise, not signal. Re-run after real production traffic before acting on any of them.

---

## LOW / NOTES

- **`pool.js` defaults to `rejectUnauthorized: false`** — connections stay encrypted but the certificate chain is unverified, leaving a theoretical MITM window. This is Supabase's documented guidance for Supavisor pooler connections and the code provides `DATABASE_SSL_CA` to opt into full verification. Set it in production to close the gap.
- **Two extensions in `public`** (`pg_trgm`, `vector`, `unaccent`) — linter WARN; move to a dedicated schema at the next convenient migration.
- **Stale comment, not a bug:** `next.config.js` says CSP lives in `src/middleware.ts`, and no such file exists. This initially looked like the security middleware had been deleted. It has not — Next.js 16 renamed the convention to `proxy.ts` (`src/proxy.ts` correctly exports `proxy` + `config`, and the project is on `next@^16.2.6`). Only the comment is wrong. Flagged so nobody else loses time chasing it.

---

## What is working well

Worth recording, so these are not eroded by future changes:

- **RLS discipline across 125/130 tables** with a consistent deny-all pattern, plus `security_invoker` on views and pinned `search_path` on functions (migration 059).
- **Layered rate limiting** — global IP limiter, per-authenticated-user limiter keyed on `req.user.id` (so shared NATs don't collide), and tighter login/registration limits.
- **CORS as an explicit allowlist** with credentials, and a documented rationale for the `x-org-id` header that correctly notes the backend ignores it for non-super-admins.
- **Clean secret hygiene** — `.env` and `.env.*` are gitignored and nothing sensitive is tracked.
- **Startup fail-fast** on `DATABASE_URL` / `JWT_SECRET` / `FRONTEND_URL`, including a minimum JWT secret length check.
- **Slow-query instrumentation** in the pool (>1s logged) and sensible statement/query timeouts.

---

## Coverage & Limitations

State these before treating the audit as exhaustive:

1. **Cloudflare was assessed from code only.** The Cloudflare MCP server disconnected during this session and no replacement was offered, so I could not inspect the live R2 bucket (public-access setting, CORS policy, lifecycle rules, object count), DNS, WAF rules, or zone configuration. **The R2 bucket's public-access setting is unverified and matters directly to H2** — if the bucket is public, the UUID-obscurity mitigation weakens further.
2. **Outbound network is blocked in this sandbox** (probes returned HTTP 000), so I could not empirically confirm whether the Supabase Data API is reachable from the internet, nor test C1 end-to-end with an anon key. C1 rests on the database state, grants, and Supabase's own EXTERNAL-facing linter verdict.
3. **`node_modules` is not installed** in either repo, so `tsc --noEmit`, ESLint, the test suites, and `npm audit` could not be run. No static-analysis or dependency-vulnerability sweep was performed beyond the manually identified `xlsx` CVEs.
4. **A second Supabase project exists** in the same org — `Attendance` (`qtxvrivxoxibcvbtqwfk`, created 2026-07-01). It was outside the stated scope and was **not audited**. If it backs the biometric/attendance feature it deserves the same RLS review as C1.
5. **One MCP server in this session requires authorization** and is unavailable until it is authorized from claude.ai connector settings; it may cover infrastructure not represented here.
6. This audit covers security, data integrity, and infrastructure configuration. It is **not** a functional QA pass — see `DASHBOARD-AUDIT.md` for role-dashboard defects and `AUDIT-REPORT.md` for the earlier frontend UI/architecture review.

---

## Recommended order

1. **C1** — apply the RLS migration; minutes of work, closes a write-capable hole in billing data.
2. **H3** — add the R2 startup guard; prevents silent, irreversible loss of consent/medical documents.
3. **H2** — authenticate `/uploads/*`; GDPR Art. 9 exposure.
4. **H1** — reconcile migration history; until fixed, every Supabase-side schema operation is unsafe.
5. **M3**, **M1/M2**, **M4**, **M5** — as capacity allows.
6. Verify the Cloudflare R2 bucket ACL and audit the `Attendance` project (Limitations 1 and 4).
