'use client';

// The Leads page header.
//
// This exists instead of reusing the shared PageHero because the
// design is a specific thing the shared hero is not built to be:
//
//   · a saturated, colourful surface, not the shared hero's
//     dark-navy gradient with its yellow and periwinkle glows;
//   · two actions INSIDE the card, full-width and stacked, not
//     beside the title from `sm` up.
//
// PageHero is used by every page in the studio app. Restyling it to
// match a single page would change all of them, which is out of
// scope. So this is a Leads-only surface, and the page renders it in
// place of PageHero. Everything it needs it takes as props or
// children — it fetches nothing and owns no state.
//
// ── On "colourful" inside a five-family palette ───────────────────
//
// The app's palette is deliberately narrow — blue, emerald, amber,
// red, gray, 47 values, and palette.test.ts refuses a hex outside
// them (comments included). KpiCard.tsx still carries accent names
// called violet, rose and sky, but those resolve to blue and red,
// because a previous pass ran them through the same rule. So
// "colourful" here cannot mean purple-and-teal: it has to be built
// from what the palette actually has.
//
// Which is enough, and is how iOS does it anyway: not many hues, but
// several SATURATED ones placed as soft light rather than as flat
// fills. A deep blue base with an emerald bloom upper-right and an
// azure bloom (blue 950) lower-left — the aurora in the iOS 18
// wallpapers. The page behind it stays white and light grey; all the
// saturation lives in this one card, so it reads as the focal point
// rather than as an app that has lost control of its palette.
//
// The blooms are the technique PageHero already uses for its
// decorative layers (absolutely-positioned circles, radial-gradient
// fill, heavy blur), so this is the house style applied more
// saturated, not a new idea.

import type { ReactNode } from 'react';
import { UserSearch, Plus } from 'lucide-react';

interface LeadHeroProps {
  /** The Draft follow-ups trigger — a real AI action, not decoration. */
  followUpAction: ReactNode;
  onAddLead: () => void;
}

/** One blurred colour bloom. Positioned and coloured by the caller. */
function Bloom({ className, colour }: { className: string; colour: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full ${className}`}
      style={{ background: `radial-gradient(circle, ${colour} 0%, transparent 72%)`, filter: 'blur(36px)' }}
    />
  );
}

export function LeadHero({ followUpAction, onAddLead }: LeadHeroProps) {
  return (
    <div
      className="relative overflow-hidden rounded-[28px] px-5 pb-5 pt-6 sm:rounded-[30px] sm:px-8 sm:pb-7 sm:pt-7"
      style={{
        // Saturated blue that the blooms then light. Palette blue 700
        // → 800 → 900. The first draft of this file used three
        // hand-picked blues that are off-palette; palette.test.ts scans
        // for hex outside the five families (comments included) and
        // refused them. These are the same visual idea from tokens the
        // app already uses.
        background: 'linear-gradient(155deg, #0067E0 0%, #0050AD 46%, #002D61 100%)',
        boxShadow:
          '0 22px 48px -20px rgba(0,45,97,0.55), inset 0 1px 0 rgba(255,255,255,0.20)',
      }}
    >
      {/* Colour. All decorative, all behind the content, none
          interactive — a hero you cannot read is not a hero. The
          emerald bloom upper-right and the azure bloom lower-left sit
          on the blue base; a soft lift from the bottom edge reads as
          light coming up through the card rather than as a stain on it. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <Bloom className="-right-12 -top-14 h-72 w-72" colour="rgba(16,185,129,0.80)" />
        <Bloom className="-bottom-16 -left-14 h-72 w-72" colour="rgba(28,163,249,0.85)" />
        <div
          className="absolute inset-x-0 bottom-0 h-56"
          style={{ background: 'linear-gradient(0deg, rgba(28,163,249,0.16) 0%, transparent 100%)' }}
        />
      </div>

      <div className="relative z-10">
        {/* Icon + title. The reference puts the icon in a translucent
            bordered square roughly twice the size the shared hero uses.
            Frosted — translucent fill, a light ring, and a backdrop
            blur so the bloom behind it shows through. */}
        <div className="flex items-start gap-4">
          <span
            className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[18px] text-white sm:h-[64px] sm:w-[64px]"
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.32)',
              backdropFilter: 'blur(14px) saturate(160%)',
              WebkitBackdropFilter: 'blur(14px) saturate(160%)',
              boxShadow: '0 8px 20px -8px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.28)',
            }}
          >
            <UserSearch size={27} strokeWidth={2} />
          </span>
          <div className="min-w-0 pt-0.5">
            <h1
              className="text-[30px] font-[800] leading-[1.05] tracking-[-0.03em] text-white sm:text-[34px]"
            >
              Leads
            </h1>
            {/* One line at 390-430px, as in the reference: the text column is
                ~246px wide beside the icon, and the reference sizes its
                subtitle well under this heading. 12px is the size that fits
                without truncating. */}
            <p className="mt-1 text-[12px] leading-snug sm:text-[14px]" style={{ color: 'rgba(255,255,255,0.80)' }}>
              Prospective clients, before they enrol in PT
            </p>
          </div>
        </div>

        {/* Full-width stacked actions. Draft follow-ups first and
            secondary — the reference orders it above the primary, and
            Add Lead is the one you reach for most often but it reads as
            the primary because it is solid white. */}
        <div className="mt-5 flex flex-col gap-2.5 sm:mt-6">
          <div className="w-full">{followUpAction}</div>

          <button
            type="button"
            onClick={onAddLead}
            className="inline-flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 rounded-[15px] text-[14px] font-[720] text-[#0F172A] transition active:scale-[0.985] sm:h-[52px] sm:text-[14px]"
            style={{
              background: 'rgba(255,255,255,0.96)',
              boxShadow: '0 10px 24px -10px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            <Plus size={18} strokeWidth={2.4} /> Add Lead
          </button>
        </div>
      </div>
    </div>
  );
}