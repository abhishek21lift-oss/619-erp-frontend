# Premium Nav — 619 Fitness Studio OS

New navigation components on branch `feat/premium-navbar-redesign`.

## Components

### `PremiumNav`
Fixed top navbar with:
- Glass/blur background that activates on scroll
- Branded `619` monogram pill in violet gradient
- Primary nav (Dashboard, Sales, Members, Trainers, Staff) always visible on desktop
- **More** dropdown for secondary items (Attendance, Memberships, Finance, Insights, Engagement, Settings)
- Floating active pill indicator with underline glow
- Integrated search bar (click or `⌘K`) with full overlay
- Notification bell (reuses existing `NotificationBell`)
- Profile dropdown with avatar initials, name, sign-out
- Mobile bottom tab bar (5 primary + More sheet)

### `NavShell`
Layout wrapper that:
- Offsets content 56px for the fixed navbar
- Injects the ambient violet radial glow behind the nav/hero area
- Adds safe-area padding for mobile bottom nav
- Exposes `id="main-scroll"` for scroll detection

## Integration

To adopt the new nav, wrap your existing layout children with `NavShell`:

```tsx
// src/app/(dashboard)/layout.tsx  — example
import NavShell from '@/components/nav/NavShell';

export default function DashboardLayout({ children }) {
  return <NavShell>{children}</NavShell>;
}
```

Or swap `<AppShell>` → `<NavShell>` wherever the old shell is used.

## Design tokens used

| Token | Value |
|---|---|
| Nav height | 56px |
| Background (scrolled) | `rgba(10,10,11,0.90)` + `backdrop-blur-xl` |
| Accent gradient | `#7c3aed → #a855f7 → #c026d3` |
| Active pill glow | `rgba(168,85,247,0.70)` underline |
| Dropdown bg | `rgba(18,18,22,0.96)` + `backdrop-blur(20px)` |
| Border | `rgba(255,255,255,0.08)` |

## No breaking changes
Original `TopNav`, `Sidebar`, `AppShell`, `PremiumHeader` are untouched.
Switch per page/layout at your own pace.
