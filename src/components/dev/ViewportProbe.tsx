'use client';

// An on-screen readout of everything that could move bottom-fixed chrome.
//
// It exists because this bug is invisible from a laptop. Two fixes were shipped
// and merged on the strength of unit tests and reasoning, and a physical iPhone
// falsified both — the first lifted the nav mid-page, the second dropped it
// below the viewport at the document bottom. Neither reproduced anywhere but on
// the device. Attaching Safari's inspector needs a Mac and a cable; this needs
// a query string.
//
// Opt-in and dev-only, twice over: it is only rendered when NODE_ENV !==
// 'production' AND ?vvprobe=1 is in the URL. It cannot appear for a customer.
//
// Usage: append ?vvprobe=1 to any route, then scroll to the absolute bottom.
// The invariant to watch is `nav.bottom − vv.height`: it should read 0 and stay
// 0 through the toolbar collapsing, the rubber-band at the end of the document,
// and the scroll back up. Anything else is the bar leaving the viewport edge.

import { useEffect, useState } from 'react';

interface Reading {
  innerH: number;
  clientH: number;
  scrollH: number;
  scrollY: number;
  vvH: number;
  vvOffsetTop: number;
  vvPageTop: number;
  vvScale: number;
  navTop: number;
  navBottom: number;
  navPos: string;
  navTransform: string;
  inset: string;
  navH: string;
  safeBottom: string;
  where: string;
  event: string;
}

const px = (n: number) => `${Math.round(n)}`;

export default function ViewportProbe() {
  const [r, setR] = useState<Reading | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!new URLSearchParams(window.location.search).has('vvprobe')) return;

    const read = (event: string) => {
      const vv = window.visualViewport;
      const nav = document.querySelector('.mobile-bottom-nav');
      const navBox = nav?.getBoundingClientRect();
      const navStyle = nav ? getComputedStyle(nav) : null;
      const root = getComputedStyle(document.documentElement);
      const doc = document.documentElement;
      const atTop = window.scrollY < 4;
      const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 4;

      setR({
        innerH: window.innerHeight,
        clientH: doc.clientHeight,
        scrollH: doc.scrollHeight,
        scrollY: window.scrollY,
        vvH: vv?.height ?? -1,
        vvOffsetTop: vv?.offsetTop ?? -1,
        vvPageTop: vv?.pageTop ?? -1,
        vvScale: vv?.scale ?? -1,
        navTop: navBox?.top ?? -1,
        navBottom: navBox?.bottom ?? -1,
        navPos: navStyle?.position ?? '—',
        navTransform: navStyle?.transform ?? '—',
        inset: root.getPropertyValue('--vv-bottom-inset').trim() || '(unset)',
        navH: root.getPropertyValue('--bottom-nav-h').trim() || '(unset)',
        safeBottom: navStyle?.paddingBottom ?? '—',
        where: atTop ? 'TOP' : atBottom ? 'BOTTOM' : 'middle',
        event,
      });
    };

    const on = (e: string) => () => read(e);
    const vvResize = on('vv:resize');
    const vvScroll = on('vv:scroll');
    const winResize = on('win:resize');
    const winScroll = on('win:scroll');

    read('init');
    window.visualViewport?.addEventListener('resize', vvResize);
    window.visualViewport?.addEventListener('scroll', vvScroll);
    window.addEventListener('resize', winResize);
    window.addEventListener('scroll', winScroll, { passive: true });

    return () => {
      window.visualViewport?.removeEventListener('resize', vvResize);
      window.visualViewport?.removeEventListener('scroll', vvScroll);
      window.removeEventListener('resize', winResize);
      window.removeEventListener('scroll', winScroll);
    };
  }, []);

  if (!r) return null;

  // The number the whole investigation turns on. The nav's bottom edge should
  // land exactly on the bottom of the visible viewport; any drift is the bug.
  const drift = Math.round(r.navBottom - r.vvH);

  return (
    <div
      // Top-left on purpose: the thing being diagnosed lives at the bottom.
      style={{
        position: 'fixed', top: 0, left: 0, zIndex: 2147483647,
        font: '10px/1.35 ui-monospace, Menlo, monospace',
        background: 'rgba(0,0,0,0.82)', color: '#fff',
        padding: '6px 8px', maxWidth: '62vw', pointerEvents: 'none',
        whiteSpace: 'pre',
      }}
    >
      {[
        `${r.event}  @${r.where}`,
        `drift nav.bottom-vv.h  ${drift}   ${drift === 0 ? 'OK' : '*** MOVED ***'}`,
        `inner ${px(r.innerH)}  client ${px(r.clientH)}  scrollH ${px(r.scrollH)}  y ${px(r.scrollY)}`,
        `vv  h ${px(r.vvH)}  offTop ${px(r.vvOffsetTop)}  pageTop ${px(r.vvPageTop)}  scale ${r.vvScale}`,
        `nav top ${px(r.navTop)}  bottom ${px(r.navBottom)}  ${r.navPos}`,
        `nav transform ${r.navTransform}`,
        `--vv-bottom-inset ${r.inset}   --bottom-nav-h ${r.navH}`,
        `nav padding-bottom (safe area) ${r.safeBottom}`,
      ].join('\n')}
    </div>
  );
}
