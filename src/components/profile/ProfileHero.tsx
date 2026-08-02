'use client';

// The hero: cover banner, avatar, who this person is, and how finished the
// profile is.
//
// ── Why the studio name is not editable here ─────────────────────────────────
//
// "Where do you coach right now" already has a truthful answer in the database:
// the user's organisation. A second, self-authored copy of it would drift the
// first time somebody moved studios and updated only one of them, and the
// profile is exactly where that lie would be believed. So the studio shown here
// comes from the session; the self-authored list on the Credentials tab is
// presented as employment history, which is a different claim.
//
// ── No "verified" badge ──────────────────────────────────────────────────────
//
// There is no verification process yet, and a badge the wearer can set is a lie
// with a checkmark on it. It arrives when something can actually check it.

import React, { useRef, useState } from 'react';
import { m } from 'framer-motion';
import {
  Camera, Loader2, ImagePlus, Trash2, Mail, Phone, MapPin, Calendar,
  ShieldCheck, Building2, Award, Clock,
} from 'lucide-react';
import type { ProfileMe } from '@/lib/api';
import { CompletionRing } from './CompletionPanel';

/** Two letters, or one. Used whenever there is no avatar. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** A pill of metadata. Hidden entirely when there is nothing to say. */
function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
      <span className="shrink-0" aria-hidden>{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

function Badge({ icon, label, tint }: { icon: React.ReactNode; label: string; tint: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-[740]"
      style={{ background: `${tint}1a`, color: tint, border: `1px solid ${tint}33` }}
    >
      {icon} {label}
    </span>
  );
}

/**
 * An action sitting on top of the cover image.
 *
 * Never hover-only: on a touch screen a hover-revealed control is a control
 * that does not exist. These are always visible, and legible over any
 * photograph because of the scrim behind them rather than the image beneath.
 */
function CoverAction({ icon, label, onClick, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-[700] text-white transition-opacity disabled:opacity-50 sm:px-3"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.28)' }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export interface ProfileHeroProps {
  me: ProfileMe;
  /** From the session, not the form — see the note at the top of this file. */
  organizationName?: string | null;
  /** Prefixes a stored `/uploads/...` path with the API origin. */
  resolveUrl: (path: string) => string;
  roleLabel: string;
  memberSince: string;
  avatarUploading: boolean;
  coverBusy: boolean;
  onPickAvatar: (file: File) => void;
  onPickCover: (file: File) => void;
  onRemoveCover: () => void;
}

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

export function ProfileHero({
  me, organizationName, resolveUrl, roleLabel, memberSince,
  avatarUploading, coverBusy, onPickAvatar, onPickCover, onRemoveCover,
}: ProfileHeroProps) {
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  // The banner is the one image that changes size on load; without this the
  // gradient beneath it flashes through on a slow connection.
  const [coverLoaded, setCoverLoaded] = useState(false);

  const cover = me.coverUrl ? resolveUrl(me.coverUrl) : null;
  const avatar = me.avatarUrl ? resolveUrl(me.avatarUrl) : null;
  const subtitle = me.designation || me.jobTitle;
  const validCerts = me.credentialSummary
    ? me.credentialSummary.total - me.credentialSummary.expired
    : 0;

  /** Read a file, hand it up, and clear the input so the same file re-fires. */
  const take = (e: React.ChangeEvent<HTMLInputElement>, fn: (f: File) => void) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) fn(file);
  };

  return (
    <section
      className="relative mb-7 overflow-hidden rounded-3xl"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(15,23,42,0.07)' }}
      aria-label="Profile header"
    >
      {/* ── COVER ────────────────────────────────────────────────────────── */}
      <div className="relative h-28 w-full sm:h-40 lg:h-48">
        {/* The gradient is the default, not a placeholder: a profile with no
            banner should look designed rather than unfinished. */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg,#0067e0 0%,#0067e0 40%,#0067e0 70%,#7fb4ff 100%)' }}
        />
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            onLoad={() => setCoverLoaded(true)}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
            style={{ opacity: coverLoaded ? 1 : 0 }}
          />
        )}

        {/* A scrim under the controls only — a full-image overlay would dull a
            banner somebody chose deliberately. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16"
          style={{ background: 'linear-gradient(to bottom,rgba(15,23,42,0.28),transparent)' }} />

        <div className="absolute right-3 top-3 flex items-center gap-2 sm:right-4 sm:top-4">
          <input ref={coverInput} type="file" accept={ACCEPT} className="hidden"
            onChange={(e) => take(e, onPickCover)} />
          <CoverAction
            icon={coverBusy ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
            label={cover ? 'Change banner' : 'Add banner'}
            disabled={coverBusy}
            onClick={() => coverInput.current?.click()}
          />
          {cover && (
            <CoverAction icon={<Trash2 size={13} />} label="Remove" disabled={coverBusy} onClick={onRemoveCover} />
          )}
        </div>
      </div>

      {/* ── IDENTITY ─────────────────────────────────────────────────────── */}
      <div className="px-5 pb-5 sm:px-7 sm:pb-6">
        {/* The avatar rides the seam. `-mt-*` on a flex row keeps the ring
            beside it aligned to the row's baseline rather than pulled up too. */}
        <div className="flex items-end justify-between gap-3">
          <div className="-mt-8 shrink-0 sm:-mt-10">
            <input ref={avatarInput} type="file" accept={ACCEPT} className="hidden"
              onChange={(e) => take(e, onPickAvatar)} />
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              disabled={avatarUploading}
              aria-label={avatar ? 'Change profile photo' : 'Add a profile photo'}
              className="group relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[22px] text-[26px] font-[880] text-white transition-transform hover:scale-[1.03] sm:h-[92px] sm:w-[92px] sm:text-[32px]"
              style={{
                background: avatar ? 'var(--bg-card)' : 'linear-gradient(135deg,#0067e0,#0059ce)',
                border: '3px solid var(--bg-card)',
                boxShadow: '0 6px 24px rgba(15,23,42,0.20)',
                letterSpacing: '-0.02em',
              }}
            >
              {avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={avatar} alt="" className="h-full w-full object-cover" />
                : initials(me.name)}
              <span
                className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                style={{ background: 'rgba(15,23,42,0.55)' }}
              >
                {avatarUploading
                  ? <Loader2 size={18} className="animate-spin text-white" />
                  : <Camera size={18} className="text-white" />}
              </span>
            </button>
          </div>

          {/* The ring is small here on purpose — the full checklist is a card
              away, and a large ring beside a name reads as the point of the
              page, which it is not. */}
          {me.completion && (
            <div className="shrink-0 pb-1">
              <CompletionRing percent={me.completion.percent} size={56} />
            </div>
          )}
        </div>

        <div className="mt-3 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <h2 className="text-[21px] font-[880] tracking-[-0.03em] sm:text-[26px]" style={{ color: 'var(--text-primary)' }}>
              {me.name}
            </h2>
            <Badge icon={<ShieldCheck size={10} />} label={roleLabel} tint="#0067e0" />
            {me.yearsExperience !== null && me.yearsExperience > 0 && (
              <Badge icon={<Clock size={10} />} label={`${me.yearsExperience} yr${me.yearsExperience === 1 ? '' : 's'} coaching`} tint="#0067e0" />
            )}
            {validCerts > 0 && (
              <Badge icon={<Award size={10} />} label={`${validCerts} certification${validCerts === 1 ? '' : 's'}`} tint="#047857" />
            )}
          </div>

          {subtitle && (
            <p className="mt-1 text-[13px] font-[640]" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
          )}

          {/* One column of metadata on a phone: these truncate, and side by
              side at 360px they truncate to nothing useful. */}
          <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {organizationName && <Meta icon={<Building2 size={11} />}>{organizationName}</Meta>}
            <Meta icon={<Mail size={11} />}>{me.email}</Meta>
            {me.phone && <Meta icon={<Phone size={11} />}>{me.phone}</Meta>}
            {me.location && <Meta icon={<MapPin size={11} />}>{me.location}</Meta>}
            <Meta icon={<Calendar size={11} />}>Since {memberSince}</Meta>
          </div>
        </div>
      </div>

      {/* A hairline of the accent under the whole block, so the hero reads as
          one object rather than a banner with a card stuck to it. */}
      <m.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="h-[3px] w-full origin-left"
        style={{ background: 'linear-gradient(90deg,#0067e0,#0067e0,#7fb4ff)' }}
      />
    </section>
  );
}
