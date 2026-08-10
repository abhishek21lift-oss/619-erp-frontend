'use client';
/**
 * The "pick a client first" screen that fronts every per-client PT-OS tool.
 *
 * There were four hand-maintained copies of this — informed-consent, goals,
 * posture-assessment and strength-tracking — fetching the same clients through
 * the same call and rendering them four slightly different ways. Three had
 * drifted into a tall eyebrow/title/description card above a wall of small
 * name chips, where the chips carry a generic person glyph and the name is the
 * only thing distinguishing one from the next. Informed Consent had been
 * redesigned and the other three had not, which is what a copy does.
 *
 * This is that redesign, extracted rather than pasted a fourth time: a compact
 * banner, a search row that says how many clients matched, and full-width rows
 * with a coloured initials avatar so a name is findable by shape and not only
 * by reading.
 *
 * Adding a fifth tool means passing a title, an icon and a path — not copying
 * a screen.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SharedClientAvatar from '@/components/pt-os/ClientAvatar';
import { m } from 'framer-motion';
import { AlertCircle, ArrowRight, Search, Users } from 'lucide-react';
import { EmptyState, PageContainer, PageHero } from '@/components/ui';
import { BRAND_HERO_GRADIENT, BRAND_HERO_SHADOW, ON_BRAND_BORDER, ON_BRAND_TEXT } from '@/lib/brand';
import { api } from '@/lib/api';

interface ClientOption { id: string; name: string; photoUrl: string | null; }

// Deterministic per-name, so a client keeps the same colour across every tool
// and across reloads. Picking at random, or by list index, would reshuffle the
// avatars whenever the list is filtered — which defeats the point of having a
// colour to recognise.
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #0067e0, #0059ce)',
  'linear-gradient(135deg, #10b981, #34d399)',
  'linear-gradient(135deg, #f59e0b, #fbbf24)',
  'linear-gradient(135deg, #0067e0, #0059ce)',
  'linear-gradient(135deg, #0067e0, #0059ce)',
  'linear-gradient(135deg, #ef4444, #f87171)',
];

export function ClientAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length;
  return (
    <SharedClientAvatar
      name={name}
      photoUrl={photoUrl}
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-[700] text-white"
      style={{ background: AVATAR_GRADIENTS[idx] }}
    />
  );
}

interface ClientPickerProps {
  /** Shown in the banner. The tool's name, not a slogan — 'Informed Consent'. */
  title: string;
  /** One line under the title. Optional — several pickers have nothing to add. */
  subtitle?: string;
  /** The tool's lucide icon, already sized: <FileSignature size={20} color="#fff" />. */
  icon: React.ReactNode;
  /** The page this picker is rendered on — e.g. '/pt-os/goals'. Picking a
   *  client pushes `${basePath}?client_id=…` unless hrefFor overrides it. */
  basePath: string;
  /** For the tools whose real screens live somewhere else. Workout Log is the
   *  landing page for /pt-os/clients/[id]/workout-log, which is a path segment
   *  and not a query parameter, so it cannot use the default. */
  hrefFor?: (clientId: string) => string;
}

export default function ClientPicker({ title, subtitle, icon, basePath, hrefFor }: ClientPickerProps) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    api.pt.clients().then((r: { data?: unknown[] }) => {
      const arr = Array.isArray(r?.data) ? r.data : [];
      setClients((arr as Record<string, unknown>[]).map((c) => ({
        id: String(c.id),
        name: String(c.name ?? ''),
        photoUrl: c.photo_url ? String(c.photo_url) : null,
      })));
    }).catch(() => setLoadError(true)).finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageContainer>
      {/* This was a flat brand-blue strip: a coloured bar with the tool name
          in it, on its own max-w-4xl container with pt-3. It is PageHero now,
          so every picker sits where the dashboard sits and looks like the rest
          of the app rather than like a banner. The per-length type stepping
          the strip needed is gone with it — the hero wraps. */}
      <PageHero icon={icon} title={title} subtitle={subtitle} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input aria-label="Search clients"
            type="text" placeholder="Search clients..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[12px] py-2.5 pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-[#0271EB]"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        {!loading && !loadError && (
          <span className="flex-shrink-0 text-[12px] font-[600]" style={{ color: 'var(--text-disabled)' }}>
            {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
          </span>
        )}
      </div>

      {loading && (
        // Skeleton rows rather than a centred spinner: the list lands in place
        // instead of the page jumping when it arrives.
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-3 rounded-[16px] p-3.5" style={{ background: 'var(--bg-subtle)' }}>
              <div className="h-10 w-10 rounded-full" style={{ background: 'var(--border)' }} />
              <div className="h-3 w-24 rounded-full" style={{ background: 'var(--border)' }} />
            </div>
          ))}
        </div>
      )}

      {loadError && (
        <EmptyState
          icon={<AlertCircle size={20} />}
          title="Could not load clients"
          description="Something went wrong while fetching your client list."
        />
      )}

      {!loading && !loadError && filtered.length === 0 && (
        // A studio with no clients yet and a search that matched nothing are
        // different problems, and 'No clients found.' answers neither.
        <EmptyState
          icon={<Users size={20} />}
          title="No clients found"
          description={search ? `No clients match "${search}".` : 'Add a client to get started.'}
        />
      )}

      {!loading && !loadError && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(hrefFor ? hrefFor(c.id) : `${basePath}?client_id=${encodeURIComponent(c.id)}`)}
              className="group flex items-center gap-3 rounded-[16px] p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#7FB4FF] hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
            >
              <ClientAvatar name={c.name} photoUrl={c.photoUrl} />
              <span className="flex-1 truncate text-[13.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
              <ArrowRight size={14} className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--text-disabled)' }} />
            </button>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
