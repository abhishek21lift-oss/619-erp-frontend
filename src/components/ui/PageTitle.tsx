// The plain page heading AppShell used to render from a `title` prop.
//
// AppShell now comes from (chrome)/layout.tsx, which knows nothing about the
// page inside it, so the five pages that passed `title` render the heading
// themselves. This is that heading, character for character, in one place —
// the prop's markup lived in AppShell and would otherwise have been copied
// five times.
//
// Not a replacement for PageHero: this is the bare h1 that sits above a page's
// own content, which is all `title` ever produced.

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-6 text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
      {children}
    </h1>
  );
}
