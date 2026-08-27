// The staff application's chrome — sidebar, top bar, bottom nav — mounted once.
//
// Every page under this route group used to render `<Guard><AppShell>` itself.
// There are 97 of them, and React cannot reconcile two different page
// subtrees, so each client-side navigation destroyed the entire shell and
// built a new one. What that cost:
//
//   · the bottom nav unmounted and remounted, re-initialising the framer-motion
//     `layoutId` on its active pill — visible as a jump
//   · notifications refetched on every route change
//   · the `AnimatePresence mode="popLayout"` page transition inside AppShell
//     could never play an exit animation, because the tree carrying it was
//     destroyed before the exit could run — dead code paying a cost on every
//     navigation
//
// A layout persists across navigations within its segment, so the shell is now
// mounted once per session and the pages swap underneath it. Route groups
// (`(chrome)` / `(bare)`) do not affect URLs: which chrome a page gets is
// decided by which folder it lives in, resolved at build time. That is
// deliberate — the alternative, a pathname check at runtime, has to
// special-case `/`, which is listed in SESSIONLESS_PAGES and yet is the main
// dashboard, and would silently hand chrome to the 24 pages under `(bare)`
// that must not have it.
//
// Guard lives here rather than in the pages because the shell must not paint
// before the session is known. Pages that need a *role* still declare their own
// `<Guard role=…>` inside; nesting is safe — both read the same auth context,
// and the inner one adds the role check this one deliberately does not make.
//
// Both come from ChromeGate rather than being written here, for one route's
// sake: `/` is the public landing page for a visitor and the studio dashboard
// for a signed-in user, and hoisting Guard above it took the first of those
// away — the layout redirected to /login before the page's own signed-out
// branch could run, so the marketing site quietly stopped existing. ChromeGate
// carries that single exception and hands every other route the same
// <Guard><AppShell> it always had. See the comment there.

import ChromeGate from '@/components/ChromeGate';

export default function ChromeLayout({ children }: { children: React.ReactNode }) {
  return <ChromeGate>{children}</ChromeGate>;
}
