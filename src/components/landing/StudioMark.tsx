'use client';

/**
 * The studio mark, standing on the page.
 *
 * The real MY PT STUDIO artwork (/icon-512.png), not a re-drawing of it. An
 * earlier version rebuilt the cube in CSS 3D and set it swaying; it could only
 * ever approximate the logo, and an approximation of your own mark reads as a
 * knock-off of it. This shows the mark as it is, lit like an object on the
 * surface — its own shadow, a contact shadow where it meets the floor, a faint
 * cobalt bloom behind — and keeps still. It arrives once, and that is the only
 * motion; under prefers-reduced-motion it does not animate at all.
 *
 * Decorative (the page names the brand in text), so it carries an empty alt.
 */

import Image from 'next/image';
import { m, useReducedMotion } from 'framer-motion';
import { EASE, MARK } from './tokens';

export default function StudioMark({
  size,
  priority = false,
  className = '',
}: {
  /** The mark's width in px at its largest; it shrinks with its container. */
  size: number;
  priority?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div className={`relative mx-auto w-full select-none ${className}`} style={{ maxWidth: size * 1.5 }} aria-hidden>
      <div className="relative" style={{ paddingBottom: '100%' }}>
        {/* Bloom behind the mark. */}
        <div className="absolute inset-[8%]" style={{ background: MARK.bloom }} />

        {/* Contact shadow on the floor. */}
        <div className="absolute left-[12%] right-[12%] top-[73%] h-[10%]" style={{ background: MARK.contactWide, filter: 'blur(4px)' }} />
        <div className="absolute left-[24%] right-[24%] top-[74.5%] h-[6%]" style={{ background: MARK.contact, filter: 'blur(3px)' }} />

        <m.div
          className="absolute inset-x-[16.67%] top-[8%]"
          initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <Image
            src="/icon-512.png"
            alt=""
            width={512}
            height={512}
            priority={priority}
            sizes={`${size}px`}
            className="h-auto w-full"
            style={{ filter: MARK.shadow }}
          />
        </m.div>
      </div>
    </div>
  );
}
