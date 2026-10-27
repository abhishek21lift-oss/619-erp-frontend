'use client';

import { useState, useEffect, useId } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Package, Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { PACKAGE_GOAL_OPTIONS } from '@/lib/forms/schemas/ptPackage';
import { PageHero } from '@/components/ui';
import { PackageForm, type PtPackage } from '@/components/packages/PackageForm';

/* ── shared theme ─────────────────────────────── */
const a = '#F59E0B', b = '#D97706';
const grad = `linear-gradient(135deg,${a},${b})`;
const btnPrim = { padding: '10px 20px', borderRadius: 12, border: 'none', background: grad, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 20px ${a}55`, textDecoration: 'none' } as const;

const fmtINR = (n: number | string | null | undefined) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

/* ── types ────────────────────────────────────── */
// PtPackage comes from the shared form module so the list and the form agree
// on the record shape.

/**
 * The goal labels, from the schema's own option list.
 *
 * There were two copies of this list — one here for the card, one in the form's
 * <select> — and a value in one that the other did not know about renders as
 * the raw enum member. One list now.
 */
const goalLabel = (g: string | null) =>
  PACKAGE_GOAL_OPTIONS.find(t => t.value === g)?.label ?? g ?? '—';

/* ── Delete Confirm Modal ─────────────────────── */
function DeleteModal({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={onCancel}>
          <m.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px 36px', maxWidth: 380, width: '90%', textAlign: 'center', boxShadow: '0 16px 60px rgba(0,0,0,0.12)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Delete?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={onCancel}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={onConfirm}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Delete
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════
   PACKAGES TAB
══════════════════════════════════════════════ */
function PackagesTab() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<PtPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PtPackage | null>(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await api.automation.ptPackages.list() as { data: PtPackage[] };
      setPackages(res.data ?? []);
    } catch { setPackages([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPackages(); }, []);

  const filtered = packages.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (pkg: PtPackage) => {
    setEditing(pkg);
  };

  const toggleStatus = async (pkg: PtPackage) => {
    try {
      await api.automation.ptPackages.update(pkg.id, { is_active: !pkg.is_active });
      setPackages(p => p.map(x => x.id === pkg.id ? { ...x, is_active: !x.is_active } : x));
      toast.success(`Package ${pkg.is_active ? 'deactivated' : 'activated'}`);
    } catch { toast.error('Failed to toggle status'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.automation.ptPackages.delete(id);
      setPackages(p => p.filter(x => x.id !== id));
      setDeleteId(null);
      toast.success('Package deleted');
    } catch { toast.error('Failed to delete package'); setDeleteId(null); }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input aria-label="Search packages" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search packages..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 12, border: '1px solid #cbd5e1', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }} />
        </div>
        <Link href="/subscription/packages/new" style={{ ...btnPrim }}>
          <Plus size={15} /> Create Package
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>Loading packages...</div>
      ) : filtered.length === 0 ? (
        <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '60px 24px', borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Package size={48} color={a} style={{ margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>No Packages Yet</h3>
          <Link href="/subscription/packages/new" style={{ ...btnPrim, display: 'inline-flex' }}>
            <Plus size={15} /> Create Package
          </Link>
        </m.div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((pkg, i) => (
            <m.div key={pkg.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              whileHover={{ y: -4, boxShadow: `0 16px 48px ${a}22` }}
              style={{ borderRadius: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 20, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 4 }}>
                <button onClick={() => openEdit(pkg)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'var(--bg-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: a }}>
                  <Pencil size={13} />
                </button>
                <button onClick={() => setDeleteId(pkg.id)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'var(--bg-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                  <Trash2 size={13} />
                </button>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px', paddingRight: 76 }}>{pkg.name}</h3>
              {pkg.goal_type && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${a}20`, color: b, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {goalLabel(pkg.goal_type)}
                </span>
              )}
              {pkg.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0', lineHeight: 1.4 }}>{pkg.description}</p>}
              <div style={{ fontSize: 28, fontWeight: 800, color: a, letterSpacing: '-0.03em', margin: '10px 0 2px' }}>{fmtINR(pkg.price)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{pkg.session_count} sessions · {pkg.duration_days} days</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => toggleStatus(pkg)}
                  style={{ width: 40, height: 22, borderRadius: 11, border: 'none', background: pkg.is_active ? '#10b981' : '#cbd5e1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', padding: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-card)', position: 'absolute', top: 2, left: pkg.is_active ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                </button>
                <span style={{ fontSize: 11, fontWeight: 600, color: pkg.is_active ? '#10b981' : '#64748b' }}>{pkg.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </m.div>
          ))}
        </div>
      )}

      {/* Edit stays in a dialog: create has its own page, but editing from a
          card is a small, local change and the list stays visible behind it. */}
      <AnimatePresence>
        {editing && (
          <EditPackageModal
            editing={editing}
            onClose={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await fetchPackages();
            }}
          />
        )}
      </AnimatePresence>

      <DeleteModal open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={() => deleteId && handleDelete(deleteId)} />
    </>
  );
}

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function PackagesPage() {
  return (
    <Guard role="trainer">
      <PageContent />
    </Guard>
  );
}

function PageContent() {
  // No page-level background or x-padding: .shell-main already paints the
  // canvas and supplies the gutter.
  return (
    <div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '4px 0 24px', position: 'relative' }}>
        <PageHero
          className="mb-5"
          icon={<Package size={20} />}
          title="Session Packages"

        />

        {/* Content */}
        <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          <PackagesTab />
        </m.div>
      </div>
    </div>
  );
}

/* ── Edit dialog ──────────────────────────────── */

/**
 * Create is a page now. Edit keeps the dialog because it starts and ends on the
 * list, and the record being changed is already on screen.
 *
 * The dialog chrome is the repo's dialog hook, the same one sixteen other modal
 * surfaces use: focus in on open, trapped while open, returned to the trigger
 * on close, Escape to dismiss.
 */
function EditPackageModal({ editing, onClose, onSaved }: {
  editing: PtPackage;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const setDialogRef = useDialogA11y({ open: true, onClose });
  const titleId = useId();

  return (
    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', padding: 16 }}
      onClick={onClose}>
      <m.div ref={setDialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        style={{ width: '100%', maxWidth: 520, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', borderRadius: 22, background: 'var(--bg-card)', border: '1px solid rgba(0,0,0,0.07)', padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 id={titleId} style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Edit Package</h3>
          <button type="button" onClick={onClose} aria-label="Close Edit Package"
            style={{ width: 44, height: 44, borderRadius: 10, border: 'none', background: 'var(--bg-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        </div>

        <PackageForm editing={editing} onCancel={onClose} onSaved={onSaved} />
      </m.div>
    </m.div>
  );
}
