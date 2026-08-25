# Command Center — Next-Level Reconstruction

## Protected architecture

- Tenant plane and platform plane remain separate.
- PlatformShell and platform routing remain isolated from tenant UI.
- Backend authorization remains authoritative.
- MFA, platform-owner authorization, platform session boundary, and impersonation restrictions remain mandatory.
- Guardian remains deterministic.
- AI remains advisory/narrative only.
- Command allow-list, confirmation, dry-run and cooldown behavior remain protected.
- Live and historical logs remain separate.
- Audit remains a governance system.
- URL-driven navigation and Command Palette remain core operator UX.

## Implemented in this pass

### Risk & Action layer

- Added typed `commandCenter` API domain.
- Added deterministic Platform Risk UI.
- Added deterministic Operator Action Center UI.
- Composed both below the existing live infrastructure Command Center without replacing it.
- Risk/action panels are independently loaded so their failure cannot blank the infrastructure console.

## Target architecture

```text
COMMAND CENTER
├── Overview
├── Commercial
├── People
├── Intelligence
│   ├── Analytics
│   ├── AI
│   └── Guardian
├── Operations
│   ├── Health
│   ├── Risk
│   ├── Action Center
│   ├── Live Logs
│   └── Historical Logs
├── Security
├── Governance
└── Global Command Palette
```

## Next implementation layers

1. Canonical `/api/platform/*` migration after consumer verification.
2. Overview 2.0 with a first-viewport aggregation payload.
3. Guardian expansion and evidence-driven recovery actions.
4. Full privileged-mutation audit enforcement.
5. Security/session consolidation.
6. Cross-domain incident drill-down.
7. Realtime critical alerts and operator updates.
8. Platform API domain decomposition without breaking existing consumers.
9. Full integration/e2e verification.

## Removal rule

Do not delete existing Command Center capabilities while reconstructing. Remove only code proven dead after repository-wide reference and security-responsibility verification.
