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
import FounderBadge from '@/components/FounderBadge';
import { m } from 'framer-motion';
import {
  Camera, Loader2, ImagePlus, Trash2, Mail, Phone, MapPin, Calendar,
  ShieldCheck, Building2, Award, Clock, Upload,
} from 'lucide-react';
import type { ProfileMe } from '@/lib/api';
import StudioMark from '@/components/StudioMark';
import { CompletionRing } from './CompletionPanel';
import { acceptAttribute, GALLERY_RULES, LOGO_RULES } from '@/lib/forms/files';
import { tones, gradient, heroMesh, ringStops, type Tone } from './profileTheme';

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

function Badge({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: Tone }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-[760] text-white"
      style={{ background: gradient(tone), boxShadow: `0 4px 12px -4px ${tone.glow}` }}
    >
      {icon} {label}
    </span>
  );
}

/**
 * An action sitting on top of the cover image.
 *
 * Never hover-only: on a touch screen a hover-revealed control is a control
 * that does not exist. Legible over any photograph because of the scrim behind
 * it rather than the image beneath.
 *
 * The label was `hidden sm:inline` until this was reported. On a phone that
 * left a bare 13px glyph in a dark circle — indistinguishable from decoration,
 * which is how "unable to add banner image" happens to a button that works
 * perfectly. It simply did not look like one. The label shows at every width
 * now, and the target is 44px rather than the ~26px that py-1.5 produced
 * against this app's 14px root.
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
      className="inline-flex items-center gap-1.5 rounded-full px-3.5 text-[11.5px] font-[700] text-white transition-opacity disabled:opacity-50"
      style={{
        minHeight: 44,
        background: 'rgba(15,23,42,0.62)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.32)',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export interface ProfileHeroProps {
  me: ProfileMe;
  /** From the session, not the form — see the note at the top of this file. */
  organizationName?: string | null;
  /** 1–20 for a Founder's Club studio, null otherwise. See FounderBadge. */
  founderNumber?: number | null;
  /** Prefixes a stored `/uploads/...` path with the API origin. */
  resolveUrl: (path: string) => string;
  roleLabel: string;
  memberSince: string;
  avatarUploading: boolean;
  coverBusy: boolean;
  onPickAvatar: (file: File) => void;
  onPickCover: (file: File) => void;
  onRemoveCover: () => void;
  /**
   * The studio's logo, for the trainer who owns the studio. Absent for anyone
   * else — a member never sees this page, but the control is the owner's.
   */
  studioLogo?: {
    url: string | null;
    busy: boolean;
    onPick: (file: File) => void;
    onRemove: () => void;
  };
}

/**
 * The picker's filter, generated from the gallery rules.
 *
 * It is a convenience and not a control — a drop, a paste or a scripted submit
 * walks past it — but generating it from the same source as the check means the
 * two can never disagree about what this app accepts. The real validation runs
 * in the parent's pick handlers, on the bytes.
 */
const ACCEPT = acceptAttribute(GALLERY_RULES);
const LOGO_ACCEPT = acceptAttribute(LOGO_RULES);

export function ProfileHero({
  me, organizationName, founderNumber, resolveUrl, roleLabel, memberSince,
  avatarUploading, coverBusy, onPickAvatar, onPickCover, onRemoveCover, studioLogo,
}: ProfileHeroProps) {
  const avatarInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
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
      className="relative mb-7 overflow-hidden rounded-[28px]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 50px -30px rgba(79,70,229,0.45), 0 2px 12px rgba(15,23,42,0.05)' }}
      aria-label="Profile header"
    >
      {/* ── COVER ────────────────────────────────────────────────────────── */}
      <div className="relative h-32 w-full sm:h-44 lg:h-52">
        {/* The gradient is the default, not a placeholder: a profile with no
            banner should look designed rather than unfinished. */}
        <div
          className="absolute inset-0"
          style={{
            // The top-right glow is a layer on this gradient, not a separate
            // `blur-3xl` circle. WebKit promotes a filtered child to its own
            // compositing layer and then clips that layer to a RECTANGLE, so
            // the circle's square corner painted outside the section's
            // `rounded-3xl overflow-hidden`. Reported on iOS against the client
            // profile card, which carried the identical pattern. 260px was
            // fitted against the old rendering by pixel comparison: 0.30/255.
            // An Apple-style colour mesh: two soft glows over a four-stop
            // sweep. Glows are gradient layers, never blurred children —
            // see the WebKit note above.
            background: [
              `radial-gradient(circle 280px at 12% 110%, ${heroMesh.glowA}, transparent 70%)`,
              `radial-gradient(circle 260px at calc(100% - 40px) -20px, ${heroMesh.glowB}, transparent 70%)`,
              heroMesh.base,
            ].join(', '),
          }}
        />

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
          <input aria-label="Upload a banner image" ref={coverInput} type="file" accept={ACCEPT} className="hidden"
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
          <div className="relative -mt-8 shrink-0 sm:-mt-10">
            <input aria-label="Upload a profile photo" ref={avatarInput} type="file" accept={ACCEPT} className="hidden"
              onChange={(e) => take(e, onPickAvatar)} />
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              disabled={avatarUploading}
              aria-label={avatar ? 'Change profile photo' : 'Add a profile photo'}
              className="group relative flex h-[80px] w-[80px] items-center justify-center overflow-hidden rounded-full text-[28px] font-[880] text-white transition-transform hover:scale-[1.03] sm:h-[104px] sm:w-[104px] sm:text-[36px]"
              style={{
                // A gradient ring, Apple Fitness style: the padding-box is the
                // photo's plate, the border-box paints the ring through a
                // transparent border.
                background: `${avatar ? 'linear-gradient(var(--bg-card), var(--bg-card))' : gradient(tones.indigo)} padding-box, conic-gradient(from 200deg, ${ringStops.join(', ')}, ${tones.violet.from}, ${ringStops[0]}) border-box`,
                border: '4px solid transparent',
                boxShadow: '0 14px 30px -12px rgba(219,39,119,0.45), 0 0 0 4px var(--bg-card)',
                letterSpacing: '-0.02em',
              }}
            >
              {avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
                : initials(me.name)}
              {/*
                The scrim stays hover-only — it is an enhancement, and dimming
                a photo permanently to advertise a control is a poor trade on a
                device that can show the control on hover instead.
              */}
              <span
                aria-hidden
                className="absolute inset-0 hidden items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:flex"
                style={{ background: 'rgba(15,23,42,0.55)' }}
              >
                <Camera size={18} className="text-white" />
              </span>
            </button>

            {/*
              The permanent affordance, and the actual fix.

              The camera icon used to live only inside that hover scrim. A
              touch device never fires hover, so on a phone the avatar was an
              image with nothing to say it could be changed — which is how this
              came to be reported as "unable to change profile photo". The
              button was always tappable; nothing told anyone so.

              A badge on the corner rather than an overlay: it reads as an
              affordance at a glance, the way every app that lets you change a
              photo does it, and it does not dim the photo to say so.

              pointer-events-none so the badge cannot swallow taps meant for the
              button it sits on — it is a marker, not a second control.
            */}
            <span
              aria-hidden
              data-avatar-affordance
              className="pointer-events-none absolute bottom-0 right-0 flex items-center justify-center rounded-full"
              style={{
                height: 28, width: 28,
                background: gradient(tones.sunset),
                border: '2.5px solid var(--bg-card)',
                boxShadow: '0 2px 8px rgba(15,23,42,0.28)',
              }}
            >
              {avatarUploading
                ? <Loader2 size={12} className="animate-spin text-white" />
                : <Camera size={12} className="text-white" />}
            </span>
          </div>

          {/* The ring is small here on purpose — the full checklist is a card
              away, and a large ring beside a name reads as the point of the
              page, which it is not. */}
          {me.completion && (
            <div className="shrink-0 pb-1">
              <CompletionRing percent={me.completion.percent} size={60} />
            </div>
          )}
        </div>

        <div className="mt-3 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <h2 className="text-[22px] font-[880] tracking-[-0.03em] sm:text-[28px]" style={{ color: 'var(--text-primary)' }}>
              {me.name}
            </h2>
            <Badge icon={<ShieldCheck size={10} />} label={roleLabel} tone={tones.indigo} />
            {me.yearsExperience !== null && me.yearsExperience > 0 && (
              <Badge icon={<Clock size={10} />} label={`${me.yearsExperience} yr${me.yearsExperience === 1 ? '' : 's'} coaching`} tone={tones.sunset} />
            )}
            {validCerts > 0 && (
              <Badge icon={<Award size={10} />} label={`${validCerts} certification${validCerts === 1 ? '' : 's'}`} tone={tones.lime} />
            )}
          </div>

          {subtitle && (
            <p className="mt-1 text-[13px] font-[640]" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
          )}

          {/* One column of metadata on a phone: these truncate, and side by
              side at 360px they truncate to nothing useful. */}
          <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {organizationName && (
              <Meta icon={<Building2 size={11} />}>
                <span className="inline-flex items-center gap-2">
                  {organizationName}
                  {/* Beside the studio name, which is the one piece of
                      metadata the badge is actually about. */}
                  <FounderBadge number={founderNumber} size="sm" />
                </span>
              </Meta>
            )}
            <Meta icon={<Mail size={11} />}>{me.email}</Meta>
            {me.phone && <Meta icon={<Phone size={11} />}>{me.phone}</Meta>}
            {me.location && <Meta icon={<MapPin size={11} />}>{me.location}</Meta>}
            <Meta icon={<Calendar size={11} />}>Since {memberSince}</Meta>
          </div>

          {studioLogo && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[20px] p-3 sm:p-3.5"
              style={{
                background: `linear-gradient(120deg, ${tones.violet.wash}, ${tones.sky.wash})`,
                border: '1px solid var(--border)',
              }}>
              <div className="rounded-[14px] p-[2px]" style={{ background: gradient(tones.violet) }}>
                <StudioMark name={organizationName || me.name} logoUrl={studioLogo.url} size={48} radius={12} background="#FFFFFF" />
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="text-[13px] font-[780]" style={{ color: 'var(--text-primary)' }}>Studio logo</p>
                <p className="text-[11.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                  {studioLogo.url
                    ? 'Shown at the top of your sidebar and in your clients\u2019 app.'
                    : 'Add your logo and it replaces the letters at the top of your sidebar. Your photo shows at the top right.'}
                </p>
              </div>
              <input aria-label="Upload a studio logo" ref={logoInput} type="file" accept={LOGO_ACCEPT} className="hidden"
                onChange={(e) => take(e, studioLogo.onPick)} />
              {/* A row of its own on a phone, so the sentence keeps its width. */}
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <button type="button" onClick={() => logoInput.current?.click()} disabled={studioLogo.busy}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-[12px] font-[750] text-white transition-transform hover:scale-[1.03] disabled:opacity-60"
                  style={{ background: gradient(tones.violet), boxShadow: `0 8px 18px -8px ${tones.violet.glow}` }}>
                  {studioLogo.busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {studioLogo.url ? 'Change logo' : 'Upload logo'}
                </button>
                {studioLogo.url && (
                  <button type="button" onClick={studioLogo.onRemove} disabled={studioLogo.busy}
                    aria-label="Remove studio logo"
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-[12px] font-[700] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-60"
                    style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>
            </div>
          )}
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
        style={{ background: `linear-gradient(90deg, ${tones.indigo.from}, ${tones.violet.from}, ${tones.berry.from}, ${tones.sunset.from}, ${tones.gold.from})` }}
      />
    </section>
  );
}
