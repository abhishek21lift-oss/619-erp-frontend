'use client';

// The Leads page header.
//
// This exists instead of reusing the shared PageHero because the reference
// design is a specific thing the shared hero is not built to be:
//
//   · a SOLID deep-blue surface, not the shared hero's dark-navy gradient with
//     its yellow and periwinkle glows;
//   · a visible grid texture across the whole card;
//   · and — the reason a variant prop could not have done it — the two actions
//     live INSIDE the card, full-width and stacked, not beside the title.
//
// PageHero is used by every page in the studio app. Restyling it to match a
// single reference would change all of them, which is out of scope for this
// task. So this is a Leads-only surface, and the page renders it in place of
// PageHero. Everything it needs it takes as props or children — it fetches
// nothing and owns no state.

import type { ReactNode } from 'react';
import { UserSearch, Plus } from 'lucide-react';

interface LeadHeroProps {
  /** The Draft follow-ups trigger — a real AI action, not decoration. */
  followUpAction: ReactNode;
  onAddLead: () => void;
}

export function LeadHero({ followUpAction, onAddLead }: LeadHeroProps) {
  return (
    <div
      className="relative overflow-hidden rounded-[28px] px-5 pb-5 pt-6 sm:rounded-[30px] sm:px-8 sm:pb-7 sm:pt-7"
      style={{
        // Solid deep blue, lighter toward the top-right and settling to navy at
        // the bottom-left. Flat, with tonal depth only — no glows.
        // Palette blue 700 → 800 → 900. The first draft used three hand-picked
        // blues that are off-palette; palette.test.ts scans for hex outside the
        // five families (comments included, which is why they are not written
        // out here) and refused them. These three are the same visual idea — a
        // saturated blue settling into navy — from tokens the app already uses.
        background:
          'radial-gradient(120% 130% at 88% 8%, #0271EB 0%, transparent 58%),'
          + 'linear-gradient(158deg, #0050AD 0%, #003F87 46%, #002D61 100%)',
        boxShadow:
          '0 22px 48px -20px rgba(0,45,97,0.55), inset 0 1px 0 rgba(255,255,255,0.14)',
      }}
    >
      {/* The reference card carries a fine square grid across its whole
          surface. Two repeating-linear-gradients are cheaper than the SVG
          <pattern> the shared hero uses and render identically here, because
          this texture never has to animate. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 1,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.075) 1px, transparent 1px),'
            + 'linear-gradient(90deg, rgba(255,255,255,0.075) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />

      <div className="relative z-10">
        {/* Icon + title. The reference puts the icon in a translucent bordered
            square roughly twice the size the shared hero uses. */}
        <div className="flex items-start gap-4">
          <span
            className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[18px] text-white sm:h-[64px] sm:w-[64px]"
            style={{
              background: 'rgba(255,255,255,0.13)',
              border: '1px solid rgba(255,255,255,0.26)',
              backdropFilter: 'blur(6px)',
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
            <p className="mt-1 text-[12px] leading-snug sm:text-[14px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Prospective clients, before they enrol in PT
            </p>
          </div>
        </div>

        {/* Full-width stacked actions. Draft follow-ups first and secondary —
            the reference orders it above the primary, and Add Lead is the one
            you reach for most often but it reads as the primary because it is
            solid white. */}
        <div className="mt-5 flex flex-col gap-2.5 sm:mt-6">
          <div className="w-full">{followUpAction}</div>

          <button
            type="button"
            onClick={onAddLead}
            className="inline-flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 rounded-[15px] text-[14px] font-[720] text-[#0F172A] transition active:scale-[0.985] sm:h-[52px] sm:text-[14px]"
            style={{ background: '#fff', boxShadow: '0 8px 20px -8px rgba(0,0,0,0.35)' }}
          >
            <Plus size={18} strokeWidth={2.4} /> Add Lead
          </button>
        </div>
      </div>
    </div>
  );
}