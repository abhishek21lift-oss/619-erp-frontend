'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import {
  Save, User, Trash2, AlertTriangle, Camera, Loader2, CheckCircle,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import FloatInput from '@/components/ui/FloatInput';
import PhotoCropModal from '@/components/pt-os/PhotoCropModal';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

function SectionCard({ title, icon, children, accent = '#F59E0B' }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-8 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px]"
          style={{ background: `${accent}14` }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <h2 className="text-[15px] font-[720]" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {children}
    </m.div>
  );
}

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // The photo is not part of `form`: it saves on its own the moment it is
  // cropped, through its own endpoint. Folding it into the form would mean a
  // trainer could crop a face, not press Save Changes, and lose it — and would
  // put a base64 image inside every PATCH of a phone number.
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBroken, setPhotoBroken] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const initials = (n: string) =>
    n.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  /** Read the chosen file and hand it to the same crop modal new-client uses.
   *  The modal owns the compression (800px, q0.8) — a phone photo posted raw
   *  is several megabytes of base64 in a TEXT column, re-sent on every read of
   *  this client. */
  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setPickedImage(String(reader.result)); setCropOpen(true); };
    reader.readAsDataURL(file);
  };

  const savePhoto = async (dataUrl: string) => {
    setPhotoBusy(true);
    try {
      await api.pt.uploadPhoto(id, dataUrl);
      setPhotoUrl(dataUrl);
      setPhotoBroken(false);
      toast.success('Photo updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save the photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  // Who the client is. Nothing about their schedule or their money — the PT
  // dates and the amounts are not loaded, not held here and not sent back.
  const [form, setForm] = useState({
    name: '', mobile: '', email: '', gender: '', dob: '', address: '', emergency_contact: '', emergency_phone: '',
  });

  const set = (key: keyof typeof form) => (v: string) =>
    setForm(p => ({ ...p, [key]: v }));

  // Load client data
  useEffect(() => {
    (async () => {
      try {
        const clientRes = await api.pt.client(id);
        const c = (clientRes as any)?.data;
        if (c) {
          // The stored photo, so the hero shows the client rather than
          // their initials the moment the page opens.
          setPhotoUrl((c as { photo_url?: string }).photo_url ?? null);
          setForm({
            name: c.name ?? '',
            mobile: c.mobile ?? '',
            email: c.email ?? '',
            gender: c.gender ?? '',
            dob: c.dob ? String(c.dob).slice(0, 10) : '',
            address: c.address ?? '',
            emergency_contact: c.emergency_contact ?? '',
            emergency_phone: c.emergency_phone ?? '',
          });
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load client');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Deleting a client ──
  //
  // This used to be a tile in the profile's Quick Actions grid, one row from
  // "Photos" and two from "Diet Plans" — a destructive, irreversible action
  // sitting among navigation. It belongs behind the deliberate act of opening
  // Edit, at the bottom, behind a typed confirmation.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.pt.deleteClient(id);
      toast.success('Client deleted.');
      router.push('/pt-os/clients');
    } catch {
      toast.error('Failed to delete client');
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const str  = (v: string) => v.trim() || null;
      // Personal fields only.
      //
      // The five that used to follow — pt_start_date, pt_end_date,
      // duration_months, final_amount, paid_amount — are deliberately absent,
      // not merely blank. PATCH /pt-os/clients/:id builds its SET list from
      // `req.body[key] !== undefined`, so a field that is not sent leaves its
      // column exactly as it was. Sending null would have cleared it.
      //
      // Dropping them also retires a bug the backend still carries a comment
      // about: this form posted the whole client, so correcting a phone number
      // re-sent final_amount and could be refused for a price nobody touched.
      await api.pt.updateClient(id, {
        name: form.name.trim(),
        mobile: str(form.mobile),
        email: str(form.email),
        gender: str(form.gender),
        dob: str(form.dob),
        address: str(form.address),
        emergency_contact: str(form.emergency_contact),
        emergency_phone: str(form.emergency_phone),
      });
      toast.success('Client updated successfully');
      router.push(`/pt-os/clients/${id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Guard>
        <AppShell>
          <div className="animate-pulse space-y-6 p-6 max-w-3xl mx-auto">
            <div className="h-16 rounded-[20px]" style={{ background: 'var(--bg-subtle)' }} />
            {[1,2,3].map(i => <div key={i} className="h-48 rounded-[20px]" style={{ background: 'var(--bg-subtle)' }} />)}
          </div>
        </AppShell>
      </Guard>
    );
  }

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen">
          <div className="mx-auto max-w-3xl py-6 space-y-5">

            {/* ── Hero ──
                Was a back arrow, a title and a Save Changes button crammed on
                one row. All three are gone or moved:
                  * the back arrow, because the app has a bottom nav and a
                    browser back gesture, and it was the only page carrying one;
                  * Save Changes, because there is already a Save at the FOOT of
                    the form, next to Cancel, where you land after filling it in.
                    Two identical buttons on one screen is a question, not a
                    convenience;
                  * the subtitle "All changes auto-save on submit", which was not
                    true — nothing auto-saves; you press Save.
                The gradient matches the client profile hero this page is
                reached from, so editing feels like the same object. */}
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[22px] p-5"
              style={{
                background: [
                  'radial-gradient(circle 180px at calc(100% - 48px) 24px, rgba(0,103,224,0.40), transparent 70%)',
                  'linear-gradient(135deg, #0050ad 0%, #003f87 55%, #003f87 100%)',
                ].join(', '),
                boxShadow: '0 20px 48px rgba(0,80,173,0.35)',
              }}>
              <div className="flex items-center gap-4">
                {/* ── The photo option that did not exist ──
                    Tap the avatar to set or replace it. It saves immediately
                    through /pt-os/clients/:id/photo — the same endpoint the
                    new-client flow uses — so it is org-scoped by the server and
                    needs no new permission story. */}
                <button
                  type="button"
                  onClick={() => photoInput.current?.click()}
                  disabled={photoBusy}
                  aria-label={photoUrl ? "Change client's photo" : "Add a photo for this client"}
                  className="group relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] text-[24px] font-[860] text-white disabled:opacity-60"
                  style={{
                    background: 'rgba(255,255,255,0.09)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 24px rgba(0,0,0,0.28)',
                  }}>
                  {photoUrl && !photoBroken ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt={form.name} onError={() => setPhotoBroken(true)}
                      className="h-full w-full object-cover" />
                  ) : (
                    initials(form.name || '?')
                  )}
                  {/* Always visible, not hover-only: on a touch screen a
                      hover-revealed control is a control that does not exist. */}
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center py-1"
                    style={{ background: 'rgba(15,23,42,0.55)' }}>
                    {photoBusy
                      ? <Loader2 size={13} className="animate-spin text-white" />
                      : <Camera size={13} className="text-white" />}
                  </span>
                </button>
                <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp"
                  className="hidden" onChange={pickPhoto} />

                <div className="min-w-0">
                  <p className="text-[11px] font-[750] uppercase tracking-[0.14em]" style={{ color: 'rgba(184,215,255,0.75)' }}>
                    Editing
                  </p>
                  <h1 className="truncate text-[22px] font-[880] leading-tight tracking-[-0.03em] text-white">
                    {form.name || 'Client'}
                  </h1>
                  <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    Tap the photo to {photoUrl ? 'change' : 'add'} it · everything else saves with the button below
                  </p>
                </div>
              </div>
            </m.div>

            {/* ── Personal Info ── */}
            <SectionCard title="Personal Information" icon={<User size={16} />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FloatInput label="Full Name" required value={form.name} onChange={set('name')} />
                <FloatInput label="Phone Number" type="tel" value={form.mobile} onChange={set('mobile')} />
                <FloatInput label="Email Address" type="email" value={form.email} onChange={set('email')} />
                <div>
                  <label className="block text-[11px] font-[600] mb-2" style={{ color: 'var(--text-disabled)' }}>Gender</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                    className="w-full rounded-[13px] px-4 py-3.5 text-[13.5px] font-[500] outline-none appearance-none transition-all"
                    style={{
                      background: 'var(--bg-card)', color: form.gender ? '#0F172A' : '#64748b',
                      border: '1.5px solid var(--border)',
                    }}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <FloatInput label="Date of Birth" type="date" value={form.dob} onChange={set('dob')} />
                <div className="sm:col-span-2">
                  <FloatInput label="Address" value={form.address} onChange={set('address')} />
                </div>
                <FloatInput label="Emergency Contact" value={form.emergency_contact} onChange={set('emergency_contact')} />
                <FloatInput label="Emergency Number" type="tel" value={form.emergency_phone} onChange={set('emergency_phone')} />
              </div>
            </SectionCard>

            {/* PT Assignment and Financial Details were here.
                They are gone from this form, and the PATCH no longer carries
                pt_start_date, pt_end_date, duration_months, final_amount or
                paid_amount at all — see handleSave. Dates and money change
                through enrolment and renewal, which is where the decision is
                actually made; this page is for who the client is. */}

            {/* ── Save footer ── */}
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center justify-between rounded-[16px] px-5 py-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(15,23,42,0.04)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle size={15} style={{ color: '#10b981' }} />
                <span className="text-[12.5px] font-[550]" style={{ color: 'var(--text-disabled)' }}>
                  Review all fields before saving
                </span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => router.push(`/pt-os/clients/${id}`)}>
                  Cancel
                </Button>
                <Button variant="primary" iconLeft={<Save size={14} />} onClick={handleSave} loading={saving}>
                  Save Changes
                </Button>
              </div>
            </m.div>

            {/* ── Danger zone ──
                Last on the page, visually separated, and gated on typing the
                client's name. A confirm dialog alone is a reflex to dismiss;
                typing the name makes you look at who you are about to remove. */}
            <div className="mt-6 rounded-[16px] p-5"
              style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.25)' }}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: '#dc2626' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-[780]" style={{ color: '#b91c1c' }}>Delete this client</p>
                  <p className="mt-0.5 max-w-[60ch] text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                    Removes {form.name || 'this client'} along with their assessments, payments and
                    workout history. This cannot be undone.
                  </p>

                  {!deleteOpen ? (
                    <button type="button" onClick={() => setDeleteOpen(true)}
                      className="mt-3 flex h-[44px] items-center gap-2 rounded-[12px] px-4 text-[12.5px] font-[720]"
                      style={{ background: 'var(--bg-card)', border: '1px solid rgba(220,38,38,0.35)', color: '#b91c1c' }}>
                      <Trash2 size={14} /> Delete client
                    </button>
                  ) : (
                    <div className="mt-3 space-y-2.5">
                      <label className="block text-[11px] font-[700]" style={{ color: 'var(--text-muted)' }}>
                        Type <span style={{ color: '#b91c1c' }}>{form.name}</span> to confirm
                      </label>
                      <input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={form.name}
                        className="w-full max-w-[320px] rounded-[10px] px-3 text-[13px] outline-none"
                        style={{
                          height: 44, background: 'var(--bg-card)',
                          border: '1px solid rgba(220,38,38,0.3)', color: 'var(--text-primary)',
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={handleDelete}
                          disabled={deleting || confirmText.trim() !== (form.name ?? '').trim() || !form.name}
                          className="flex h-[44px] items-center gap-2 rounded-[12px] px-4 text-[12.5px] font-[720] text-white disabled:opacity-45"
                          style={{ background: '#dc2626' }}>
                          <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete permanently'}
                        </button>
                        <button type="button"
                          onClick={() => { setDeleteOpen(false); setConfirmText(''); }}
                          className="flex h-[44px] items-center rounded-[12px] px-4 text-[12.5px] font-[720]"
                          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        <PhotoCropModal
          open={cropOpen}
          initialImageSrc={pickedImage}
          onClose={() => { setCropOpen(false); setPickedImage(null); }}
          onConfirm={(dataUrl) => { setPickedImage(null); savePhoto(dataUrl); }}
        />
      </AppShell>
    </Guard>
  );
}
