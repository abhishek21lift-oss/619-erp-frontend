'use client';

/**
 * The studio object — the MY PT STUDIO mark, built in real 3D.
 *
 * The mark is an isometric cube: a black anodised frame with a cobalt "M"
 * running through it. This renders that object with CSS 3D transforms — every
 * beam is a six-sided block, lit from the same key light the soft surface
 * already assumes (up and to the left) — rather than a flat logo or a mocked
 * screenshot of the product. It is the one image the signed-out pages share,
 * so the landing page, both sign-in doors, Start Free and password recovery
 * all read as the same place.
 *
 * Deliberately decorative (aria-hidden): it carries no information, and in
 * particular no invented figures.
 *
 * Motion: a slow sway, a float, and a small tilt toward a fine pointer. All
 * three stop under prefers-reduced-motion, leaving the object at rest in its
 * three-quarter view. Only transforms animate, so the browser composites it on
 * the GPU without re-laying-out the page.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { m, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { ANNOTATION, MATERIAL } from './tokens';

type Finish = 'anodised' | 'cobalt';

type BlockProps = {
  /** Size along x, y, z before rotation, in px. */
  w: number;
  h: number;
  d: number;
  /** Centre of the block, in px from the object's centre. */
  x?: number;
  y?: number;
  z?: number;
  /** Rotation about the viewing axis, for the diagonals of the M. */
  rz?: number;
  finish: Finish;
};

const FACE: CSSProperties = {
  position: 'absolute',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

/** A rectangular block: six faces, each shaded for where it points. */
function Block({ w, h, d, x = 0, y = 0, z = 0, rz = 0, finish }: BlockProps) {
  const mat = MATERIAL[finish];
  const face = (width: number, height: number, transform: string, background: string) => (
    <div
      style={{
        ...FACE,
        left: -width / 2,
        top: -height / 2,
        width,
        height,
        transform,
        background,
        boxShadow: mat.edge,
      }}
    />
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transformStyle: 'preserve-3d',
        transform: `translate3d(${x}px, ${y}px, ${z}px) rotateZ(${rz}deg)`,
      }}
    >
      {face(w, h, `translateZ(${d / 2}px)`, mat.front)}
      {face(w, h, `rotateY(180deg) translateZ(${d / 2}px)`, mat.back)}
      {face(d, h, `rotateY(-90deg) translateZ(${w / 2}px)`, mat.front)}
      {face(d, h, `rotateY(90deg) translateZ(${w / 2}px)`, mat.side)}
      {face(w, d, `rotateX(90deg) translateZ(${h / 2}px)`, mat.top)}
      {face(w, d, `rotateX(-90deg) translateZ(${h / 2}px)`, mat.back)}
    </div>
  );
}

/** The cube frame and the M inside it, at side length `s`. */
function StudioObject({ s }: { s: number }) {
  const t = Math.round(s * 0.13); // beam thickness
  const o = s / 2 - t / 2; // centre offset of an edge beam
  const inner = s - 2 * t; // span between two parallel edges

  const frame: BlockProps[] = [
    // Four edges running left–right. These own the corners.
    ...[-1, 1].flatMap((sy) => [-1, 1].map((sz) => ({ w: s, h: t, d: t, y: sy * o, z: sz * o, finish: 'anodised' as const }))),
    // Four uprights.
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ w: t, h: inner, d: t, x: sx * o, z: sz * o, finish: 'anodised' as const }))),
    // Four edges running front–back.
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sy) => ({ w: t, h: t, d: inner, x: sx * o, y: sy * o, finish: 'anodised' as const }))),
  ];

  // The M, standing on the cube's centre plane: two uprights and the two
  // strokes that meet between them.
  const mt = Math.round(t * 0.9);
  const mx = s * 0.25; // half the distance between the M's uprights
  const mh = inner - 8; // M upright height, clear of the top and bottom edges
  const vy = s * 0.12; // where the two strokes meet, below centre
  const dx = mx;
  const dy = vy + mh / 2;
  const len = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const mark: BlockProps[] = [
    { w: mt, h: mh, d: mt, x: -mx, finish: 'cobalt' },
    { w: mt, h: mh, d: mt, x: mx, finish: 'cobalt' },
    { w: len, h: mt, d: mt, x: -mx / 2, y: (-mh / 2 + vy) / 2, rz: angle, finish: 'cobalt' },
    { w: len, h: mt, d: mt, x: mx / 2, y: (-mh / 2 + vy) / 2, rz: -angle, finish: 'cobalt' },
  ];

  return (
    <>
      {frame.map((b, i) => <Block key={`f${i}`} {...b} />)}
      {mark.map((b, i) => <Block key={`m${i}`} {...b} />)}
    </>
  );
}

export type CubeLabel = {
  text: string;
  /** Which side of the object the callout sits on. */
  side: 'left' | 'right';
  /** Vertical position as a fraction of the stage height, 0 = top. */
  at: number;
};

/**
 * Drafting-sheet callouts: a dot on the object, a hairline, a label.
 * Positioned in 2D over the stage — they annotate, they do not orbit.
 */
function Callout({ label, stage }: { label: CubeLabel; stage: number }) {
  const left = label.side === 'left';
  const reach = stage * 0.2;
  return (
    <div
      className="pointer-events-none absolute hidden items-center sm:flex"
      style={{
        top: `${label.at * 100}%`,
        [left ? 'right' : 'left']: `calc(50% + ${stage * 0.22}px)`,
        flexDirection: left ? 'row-reverse' : 'row',
        transform: 'translateY(-50%)',
      }}
    >
      <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: ANNOTATION.dot, boxShadow: '0 0 0 3px rgba(0,103,224,0.14)' }} />
      <span className="h-px shrink-0" style={{ width: reach, background: ANNOTATION.line }} />
      <span
        className="whitespace-nowrap px-2 font-mono text-[10.5px] font-[600] uppercase tracking-[0.16em]"
        style={{ color: ANNOTATION.text }}
      >
        {label.text}
      </span>
    </div>
  );
}

export default function StudioCube({
  maxSize = 300,
  minSize = 110,
  fill = 0.5,
  labels,
  className,
  children,
}: {
  /** Largest cube side, px. */
  maxSize?: number;
  /** Smallest cube side, px. */
  minSize?: number;
  /** Cube side as a fraction of the container width. */
  fill?: number;
  labels?: CubeLabel[];
  className?: string;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(maxSize);

  // Size to the container, so one component serves a phone header and a
  // desktop hero without two copies in the DOM.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setS(Math.round(Math.max(minSize, Math.min(maxSize, w * fill))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxSize, minSize, fill]);

  // Pointer tilt, fine pointers only: a finger dragging across a phone should
  // scroll the page, not wobble the logo.
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rx = useSpring(tiltX, { stiffness: 60, damping: 18 });
  const ry = useSpring(tiltY, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (reduce) return;
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      tiltY.set(nx * 14);
      tiltX.set(-ny * 10);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce, tiltX, tiltY]);

  const stage = s * 1.9;

  return (
    <div ref={wrapRef} aria-hidden className={`relative w-full select-none ${className ?? ''}`}>
      <div className="relative mx-auto" style={{ width: stage, height: stage, maxWidth: '100%' }}>
        {/* Contact shadow on the floor. Breathes with the float. */}
        <m.div
          className="absolute left-1/2"
          style={{ x: '-50%', top: stage * 0.8, width: s * 1.9, height: s * 0.34, background: MATERIAL.floorWide, filter: 'blur(6px)' }}
          animate={reduce ? undefined : { opacity: [0.85, 0.6, 0.85], scaleX: [1, 0.92, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <m.div
          className="absolute left-1/2"
          style={{ x: '-50%', top: stage * 0.815, width: s * 1.15, height: s * 0.2, background: MATERIAL.floorCore, filter: 'blur(3px)' }}
          animate={reduce ? undefined : { opacity: [1, 0.72, 1], scaleX: [1, 0.9, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* The object. */}
        <div className="absolute inset-0" style={{ perspective: s * 6, perspectiveOrigin: '50% 35%' }}>
          <m.div
            className="absolute left-1/2 top-[44%]"
            style={{ transformStyle: 'preserve-3d' }}
            animate={reduce ? undefined : { y: [0, -s * 0.035, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <m.div style={{ transformStyle: 'preserve-3d', rotateX: rx, rotateY: ry }}>
              <m.div
                style={{ transformStyle: 'preserve-3d', rotateX: -24 }}
                initial={{ rotateY: -32 }}
                animate={reduce ? undefined : { rotateY: [-40, -24] }}
                transition={{ duration: 10, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
              >
                <StudioObject s={s} />
              </m.div>
            </m.div>
          </m.div>
        </div>

        {labels?.map((l) => <Callout key={l.text} label={l} stage={stage} />)}
        {children}
      </div>
    </div>
  );
}
