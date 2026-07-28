'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Check, Camera, CheckCircle2, Award, FileSpreadsheet, X, ClipboardCheck,
} from 'lucide-react';
import { getSheetCacheSync, lookupByMobile } from '@/lib/sheet-import';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import FloatInput from '@/components/ui/FloatInput';
import PhotoCropModal from '@/components/pt-os/PhotoCropModal';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { useToast } from '@/lib/toast';

/* ─────────────────────────────────────────────────────── TYPES */
interface FormData {
  name: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  dob: string;
  mobile: string;
  whatsapp: string;
  whatsappSameAsMobile: boolean;
  email: string;
  emergencyContact: string;
  emergencyPhone: string;
  occupation: string;
  address: string;
  photoDataUrl: string | null;
}

interface FormErrors {
  name?: string; gender?: string; dob?: string; mobile?: string;
  whatsapp?: string; email?: string; emergencyPhone?: string;
  occupation?: string; address?: string;
}

const GENDERS: FormData['gender'][] = ['Male', 'Female', 'Other'];

const OCCUPATIONS = [
  'Student', 'Doctor', 'Engineer', 'Teacher', 'Business',
  'Housewife', 'Police', 'Army', 'Lawyer', 'Retired', 'Other',
];

function initForm(): FormData {
  return {
    name: '', gender: '', dob: '', mobile: '', whatsapp: '', whatsappSameAsMobile: true,
    email: '', emergencyContact: '', emergencyPhone: '', occupation: '', address: '', photoDataUrl: null,
  };
}

/* ─────────────────────────────────────────────────────── VALIDATION */
const MOBILE_RE = /^[6-9]\d{9}$/; // mirrors the backend's ptClientCreateSchema exactly
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // reused verbatim from src/app/trainers/add/page.tsx

function computeAge(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function validateName(v: string): string | undefined {
  const t = v.trim();
  if (!t) return 'Full name is required.';
  if (t.length < 3) return 'Name must be at least 3 characters.';
  return undefined;
}
function validateGender(v: string): string | undefined {
  return v ? undefined : 'Please select a gender.';
}
function validateDob(v: string): string | undefined {
  if (!v) return undefined; // optional
  const d = new Date(v);
  if (isNaN(d.getTime())) return 'Invalid date.';
  if (d > new Date()) return 'Date of birth cannot be in the future.';
  const age = computeAge(v);
  if (age === null || age < 10 || age > 100) return 'Age must be between 10 and 100 years.';
  return undefined;
}
function validateMobile(v: string): string | undefined {
  const digits = v.replace(/\D/g, '');
  if (!digits) return 'Mobile number is required.';
  if (!MOBILE_RE.test(digits)) return 'Enter a valid 10-digit Indian mobile number.';
  return undefined;
}
function validateWhatsapp(v: string, sameAsMobile: boolean): string | undefined {
  if (sameAsMobile) return undefined;
  const digits = v.replace(/\D/g, '');
  if (!digits) return undefined; // optional when entered independently
  if (!MOBILE_RE.test(digits)) return 'Enter a valid 10-digit Indian mobile number.';
  return undefined;
}
function validateEmail(v: string): string | undefined {
  if (!v.trim()) return undefined; // optional
  return EMAIL_RE.test(v.trim()) ? undefined : 'Enter a valid email address.';
}
function validateEmergencyPhone(v: string): string | undefined {
  const digits = v.replace(/\D/g, '');
  if (!digits) return undefined; // optional
  if (!MOBILE_RE.test(digits)) return 'Enter a valid 10-digit Indian mobile number.';
  return undefined;
}
function validateOccupation(v: string): string | undefined {
  return v.trim() ? undefined : 'Please select or enter an occupation.';
}
function validateAddress(v: string): string | undefined {
  return v.trim() ? undefined : 'Address is required.';
}

function validateAll(form: FormData): FormErrors {
  return {
    name: validateName(form.name),
    gender: validateGender(form.gender),
    dob: validateDob(form.dob),
    mobile: validateMobile(form.mobile),
    whatsapp: validateWhatsapp(form.whatsapp, form.whatsappSameAsMobile),
    email: validateEmail(form.email),
    emergencyPhone: validateEmergencyPhone(form.emergencyPhone),
    occupation: validateOccupation(form.occupation),
    address: validateAddress(form.address),
  };
}

function hasErrors(errors: FormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

function computeProgress(form: FormData): number {
  let filled = 0;
  const total = 8; // 5 required + 3 optional bonus (DOB, Email, Emergency Phone)
  if (!validateName(form.name)) filled++;
  if (!validateGender(form.gender)) filled++;
  if (!validateMobile(form.mobile)) filled++;
  if (!validateOccupation(form.occupation)) filled++;
  if (!validateAddress(form.address)) filled++;
  if (form.dob.trim() && !validateDob(form.dob)) filled++;
  if (form.email.trim() && !validateEmail(form.email)) filled++;
  if (form.emergencyPhone.trim() && !validateEmergencyPhone(form.emergencyPhone)) filled++;
  return Math.round((filled / total) * 100);
}

const EASE = [0.16, 1, 0.3, 1] as const;
const DRAFT_KEY = 'pt-os.new-client.draft.v1';

/* ─────────────────────────────────────────────────────── PAGE EXPORT */
export default function NewPTClientPage() {
  return <Guard><AppShell><NewClientForm /></AppShell></Guard>;
}

/* ─────────────────────────────────────────────────────── SECTION (divider layout, no card) */
interface SectionProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  last?: boolean;
  children: React.ReactNode;
}
function Section({ kicker, title, subtitle, last, children }: SectionProps) {
  return (
    <div className={last ? '' : 'pb-10 mb-10 border-b'} style={last ? undefined : { borderColor: 'var(--border)' }}>
      {kicker && (
        <p className="mb-1.5 text-[11px] font-[700] uppercase tracking-wider" style={{ color: '#F59E0B' }}>{kicker}</p>
      )}
      <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">{title}</h2>
      {subtitle && <p className="text-[13px] text-slate-400 mt-1.5 mb-7">{subtitle}</p>}
      {!subtitle && <div className="mb-7" />}
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── MAIN FORM */
function NewClientForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState<FormData>(initForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [droppedImageSrc, setDroppedImageSrc] = useState<string | null>(null);
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const [sheetRowCount, setSheetRowCount] = useState<number | null>(null);
  const [autofillNote, setAutofillNote] = useState('');
  const autofillTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initFormRef = useRef<FormData>(initForm());

  /* ── Auto-save draft (photo excluded — see useAutoSaveDraft) ── */
  const draftData = useMemo(() => {
    const { photoDataUrl: _omit, ...rest } = form;
    return rest;
  }, [form]);
  const isDirty = useMemo(
    () => JSON.stringify(draftData) !== JSON.stringify((() => { const { photoDataUrl: _o, ...r } = initFormRef.current; return r; })()),
    [draftData],
  );
  const { restore, clear, saveNow } = useAutoSaveDraft({ key: DRAFT_KEY, data: draftData, isDirty });

  useEffect(() => {
    const draft = restore();
    if (draft) {
      setForm((f) => ({ ...f, ...draft }));
      toast.info('Restored your unsaved draft.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDirty || showSuccess) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, showSuccess]);

  useEffect(() => {
    const cache = getSheetCacheSync();
    if (cache?.rowCount) setSheetRowCount(cache.rowCount);
  }, []);

  /* ── Sheet-import autofill (trimmed to the fields this form still collects) ── */
  useEffect(() => {
    if (autofillTimer.current) clearTimeout(autofillTimer.current);
    const digits = form.mobile.replace(/\D/g, '');
    if (digits.length < 10) { setAutofillNote(''); return; }
    autofillTimer.current = setTimeout(() => {
      const rec = lookupByMobile(form.mobile);
      if (!rec) return;
      let filled = 0;
      setForm((prev) => {
        const next = { ...prev };
        const sheetName = rec.name || [rec.first_name, rec.last_name].filter(Boolean).join(' ');
        if (sheetName && !prev.name) { next.name = sheetName; filled++; }
        const gMap: Record<string, FormData['gender']> = { male: 'Male', female: 'Female', other: 'Other', m: 'Male', f: 'Female' };
        const gKey = (rec.gender || '').toLowerCase().trim();
        const mappedGender = gMap[gKey];
        if (mappedGender && !prev.gender) { next.gender = mappedGender; filled++; }
        if (rec.dob && !prev.dob) { next.dob = rec.dob; filled++; }
        if (rec.email && !prev.email) { next.email = rec.email; filled++; }
        if (rec.address && !prev.address) { next.address = rec.address; filled++; }
        if (rec.emergency_no && !prev.emergencyPhone) { next.emergencyPhone = rec.emergency_no; filled++; }
        return next;
      });
      if (filled > 0) setAutofillNote(`Auto-filled ${filled} field${filled > 1 ? 's' : ''} from imported sheet`);
    }, 350);
    return () => { if (autofillTimer.current) clearTimeout(autofillTimer.current); };
  }, [form.mobile]);

  const set = useCallback(<K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const touchField = useCallback((key: keyof FormErrors) => {
    setErrors((prev) => ({ ...prev, [key]: validateAll(form)[key] }));
  }, [form]);

  const progress = useMemo(() => computeProgress(form), [form]);
  const age = computeAge(form.dob);

  const handleWhatsappToggle = (checked: boolean) => {
    setForm((prev) => ({ ...prev, whatsappSameAsMobile: checked, whatsapp: checked ? prev.mobile : prev.whatsapp }));
  };

  // Keep WhatsApp mirrored live while "same as mobile" is checked.
  useEffect(() => {
    if (form.whatsappSameAsMobile) set('whatsapp', form.mobile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.mobile, form.whatsappSameAsMobile]);

  const handleSaveDraft = () => {
    const ok = saveNow();
    toast[ok ? 'success' : 'error'](ok ? 'Draft saved.' : 'Could not save draft — storage unavailable.');
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    router.back();
  };

  const handleSubmit = async () => {
    const allErrors = validateAll(form);
    setErrors(allErrors);
    if (hasErrors(allErrors)) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.pt.create({
        name: form.name.trim(),
        gender: form.gender,
        dob: form.dob,
        mobile: form.mobile.replace(/\D/g, ''),
        whatsapp: form.whatsappSameAsMobile
          ? form.mobile.replace(/\D/g, '')
          : (form.whatsapp.replace(/\D/g, '') || undefined),
        email: form.email.trim() || undefined,
        emergency_contact: form.emergencyContact.trim() || undefined,
        emergency_phone: form.emergencyPhone.replace(/\D/g, '') || undefined,
        occupation: form.occupation.trim(),
        address: form.address.trim(),
      } as Record<string, unknown>);
      const created = (res as { data?: { id?: string } })?.data;
      clear();
      setShowSuccess(true);
      setCreatedId(created?.id || null);
      if (form.photoDataUrl && created?.id) {
        try {
          await api.pt.uploadPhoto(created.id, form.photoDataUrl);
        } catch {
          toast.warning('Client created, but the photo upload failed. You can add it from the client profile.');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create client.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPhotoDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please drop an image file.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setDroppedImageSrc(String(reader.result)); setCropModalOpen(true); };
    reader.readAsDataURL(file);
  };

  /* ── SUCCESS SCREEN ── */
  if (showSuccess) {
    return (
      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[80vh] items-center justify-center px-5">
        <div className="w-full max-w-md text-center">
          <div className="relative inline-flex items-center justify-center mb-8">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-30" style={{ background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)', transform: 'scale(2.5)' }} />
            <m.div
              initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 18 }}
              className="relative flex h-28 w-28 items-center justify-center rounded-[32px]"
              style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', boxShadow: '0 24px 64px rgba(15,23,42,0.35)' }}
            >
              <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}>
                <CheckCircle2 size={52} color="#F59E0B" strokeWidth={1.5} />
              </m.div>
            </m.div>
          </div>

          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h2 className="text-[32px] font-[900] tracking-[-0.04em] text-slate-900 leading-none mb-3">Client Onboarded!</h2>
            <p className="text-[15px] text-slate-500 leading-relaxed mb-6">
              <span className="font-[700] text-slate-800">{form.name}</span> has been successfully registered.
            </p>
          </m.div>

          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-col gap-3 justify-center mt-6">
            <Button
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}
              onClick={() => router.push(`/pt-os/informed-consent?client_id=${createdId}`)}
            >
              <ClipboardCheck size={17} className="mr-2" />
              Start Client Screening
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/pt-os/clients/${createdId}/enroll`)}
            >
              Enroll in PT
            </Button>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push(`/pt-os/clients/${createdId}`)}>
                View Client Profile
              </Button>
              <Button variant="ghost" onClick={() => { setShowSuccess(false); setForm(initForm()); initFormRef.current = initForm(); setErrors({}); }}>
                Onboard Another
              </Button>
            </div>
          </m.div>
        </div>
      </m.div>
    );
  }

  return (
    <div className="pb-28">

      {/* ── PAGE HEADER ── */}
      {/* Header — in normal flow on the page background (no sticky card). */}
      <div className="pt-1">
        <div className="mx-auto max-w-3xl py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 6px 18px rgba(245,158,11,0.3)' }}>
              <Award size={18} color="#fff" />
            </div>
            <div>
              <h1 className="text-[19px] font-[860] tracking-[-0.03em] text-slate-900 leading-none sm:text-[22px]">New PT Client</h1>
              <p className="text-[12px] font-[600] text-slate-400 mt-1">Create a new Personal Training client profile.</p>
            </div>
          </div>
          {/* Progress */}
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-[11px] font-[700] uppercase tracking-wider text-slate-400">Progress</span>
            <span className="text-[12px] font-[800]" style={{ color: '#F59E0B' }}>{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
            <m.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg,#F59E0B,#D97706)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: EASE }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl py-6">
        {/* ── SHEET IMPORT BANNER ── */}
        {sheetRowCount !== null && (
          <m.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-3 rounded-[14px] px-4 py-3"
            style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid rgba(13,148,136,0.18)' }}
          >
            <FileSpreadsheet size={15} style={{ color: '#0d9488', flexShrink: 0 }} />
            <span className="text-[12.5px] font-[640] flex-1" style={{ color: '#065f46' }}>
              {sheetRowCount} records imported — enter mobile number to auto-fill fields
            </span>
            <button onClick={() => setSheetRowCount(null)} className="opacity-60 hover:opacity-100 transition-opacity">
              <X size={13} style={{ color: '#065f46' }} />
            </button>
          </m.div>
        )}

        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>

          {/* ═══ CLIENT INFORMATION ═══ */}
          <Section kicker="Client Information" title="Basic Information" last>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <FloatInput
                label="Full Name" required value={form.name}
                onChange={(v) => set('name', v)}
                onBlur={() => touchField('name')}
                error={errors.name}
              />

              <div>
                <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
                  Gender <span style={{ color: '#F59E0B' }}>*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g} type="button"
                      onClick={() => { set('gender', g); setErrors((e) => ({ ...e, gender: undefined })); }}
                      className="rounded-[11px] px-4 py-2.5 text-[13px] font-[660] transition-all duration-200"
                      style={{
                        background: form.gender === g ? '#0f172a' : '#f8fafc',
                        color: form.gender === g ? '#fff' : '#64748b',
                        border: form.gender === g ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                        boxShadow: form.gender === g ? '0 2px 12px rgba(15,23,42,0.18)' : 'none',
                        transform: form.gender === g ? 'scale(1.03)' : 'scale(1)',
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                {errors.gender && <p className="mt-1.5 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{errors.gender}</p>}
              </div>

              <FloatInput
                label="Date of Birth" type="date" value={form.dob}
                onChange={(v) => set('dob', v)}
                onBlur={() => touchField('dob')}
                error={errors.dob}
              />

              <FloatInput label="Age" value={age !== null ? String(age) : ''} onChange={() => {}} disabled />

              <div>
                <FloatInput
                  label="Contact Number" type="tel" required value={form.mobile}
                  onChange={(v) => set('mobile', v)}
                  onBlur={() => touchField('mobile')}
                  error={errors.mobile}
                />
                <AnimatePresence>
                  {autofillNote && (
                    <m.div
                      initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-1.5 flex items-center gap-2 rounded-[10px] px-3 py-2"
                      style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.18)' }}
                    >
                      <CheckCircle2 size={12} style={{ color: '#0d9488', flexShrink: 0 }} />
                      <span className="text-[11.5px] font-[640]" style={{ color: '#065f46' }}>{autofillNote}</span>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <FloatInput
                  label="WhatsApp Number" type="tel" value={form.whatsapp}
                  onChange={(v) => set('whatsapp', v)}
                  onBlur={() => touchField('whatsapp')}
                  error={errors.whatsapp}
                  disabled={form.whatsappSameAsMobile}
                />
                <label className="mt-2 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox" checked={form.whatsappSameAsMobile}
                    onChange={(e) => handleWhatsappToggle(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#F59E0B]"
                  />
                  <span className="text-[12.5px] font-[560] text-slate-500">Same as Mobile</span>
                </label>
              </div>

              <FloatInput
                label="Email Address" type="email" value={form.email}
                onChange={(v) => set('email', v)}
                onBlur={() => touchField('email')}
                error={errors.email}
              />

              <FloatInput
                label="Emergency Contact" placeholder="e.g. spouse, parent, friend" value={form.emergencyContact}
                onChange={(v) => set('emergencyContact', v)}
              />

              <FloatInput
                label="Emergency Number" type="tel" value={form.emergencyPhone}
                onChange={(v) => set('emergencyPhone', v)}
                onBlur={() => touchField('emergencyPhone')}
                error={errors.emergencyPhone}
              />

              <SearchableSelect
                label="Occupation" required value={form.occupation}
                onChange={(v) => { set('occupation', v); setErrors((e) => ({ ...e, occupation: undefined })); }}
                options={OCCUPATIONS}
                error={errors.occupation}
              />

              <div className="sm:col-span-2">
                <FloatInput
                  label="Address" required value={form.address}
                  onChange={(v) => set('address', v)}
                  onBlur={() => touchField('address')}
                  error={errors.address}
                  multiline autoGrow
                />
              </div>

              {/* Profile Photo */}
              <div className="sm:col-span-2">
                <p className="mb-3 text-[12px] font-[700] uppercase tracking-widest text-slate-400">Profile Photo</p>
                {form.photoDataUrl ? (
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.photoDataUrl} alt="Client preview" className="h-20 w-20 rounded-full object-cover shadow-lg" />
                    <div className="flex flex-col gap-1.5">
                      <button type="button" onClick={() => setCropModalOpen(true)} className="text-left text-[12.5px] font-[640]" style={{ color: '#F59E0B' }}>
                        Change Photo
                      </button>
                      <button type="button" onClick={() => set('photoDataUrl', null)} className="text-left text-[12.5px] font-[640] text-slate-400">
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button" tabIndex={0}
                    onDragOver={(e) => { e.preventDefault(); setPhotoDragOver(true); }}
                    onDragLeave={() => setPhotoDragOver(false)}
                    onDrop={handlePhotoDrop}
                    onClick={() => setCropModalOpen(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCropModalOpen(true); }}
                    className="flex w-full cursor-pointer flex-col items-center justify-center rounded-[18px] border-2 border-dashed p-6 text-center transition-all"
                    style={{
                      borderColor: photoDragOver ? 'rgba(245,158,11,0.6)' : 'rgba(15,23,42,0.12)',
                      background: photoDragOver ? 'rgba(245,158,11,0.05)' : 'var(--bg-subtle)',
                    }}
                  >
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[14px]" style={{ background: 'var(--bg-subtle)' }}>
                      <Camera size={20} style={{ color: photoDragOver ? '#F59E0B' : '#94a3b8' }} />
                    </div>
                    <p className="text-[13px] font-[640] text-slate-500">
                      {photoDragOver ? 'Drop here' : 'Drag & drop, browse, or use your camera'}
                    </p>
                    <p className="text-[11.5px] mt-1 text-slate-400">JPG or PNG — optional</p>
                  </div>
                )}
              </div>
            </div>
          </Section>

        </m.div>
      </div>

      {/* ── STICKY FOOTER ── */}
      <div className="page-action-bar" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-3.5 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSaveDraft}>Save Draft</Button>
            <Button
              iconLeft={!saving ? <Check size={14} /> : undefined}
              loading={saving} disabled={saving}
              onClick={handleSubmit}
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}
            >
              {saving ? 'Creating...' : 'Create Client'}
            </Button>
          </div>
        </div>
      </div>

      <PhotoCropModal
        open={cropModalOpen}
        initialImageSrc={droppedImageSrc}
        onClose={() => { setCropModalOpen(false); setDroppedImageSrc(null); }}
        onConfirm={(dataUrl) => { set('photoDataUrl', dataUrl); setDroppedImageSrc(null); }}
      />
    </div>
  );
}
