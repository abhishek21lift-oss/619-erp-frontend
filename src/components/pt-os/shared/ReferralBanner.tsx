'use client';

import { Stethoscope } from 'lucide-react';

// A screening finding that needs someone other than the trainer — pain on a
// movement screen, suspected scoliosis. Shown live while the screen is being
// filled in and on its review, so the referral is made before the programme
// is written, not discovered in a score afterwards.
export default function ReferralBanner({ referrals }: { referrals: string[] }) {
  if (!referrals.length) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-[16px] p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
      <Stethoscope size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
      <div>
        <p className="text-[13px] font-[760]" style={{ color: '#991b1b' }}>Referral recommended</p>
        <ul className="mt-1 space-y-0.5">
          {referrals.map((r) => (
            <li key={r} className="text-[12.5px] font-[560]" style={{ color: '#991b1b' }}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
