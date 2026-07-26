// Small SVG authoring toolkit for the hand-drawn anatomy diagrams.
//
// These diagrams are ORIGINAL WORK authored for this application. That is the
// whole point: the sourcing route for skeleton/joint/ligament/rehab/exercise
// artwork was blocked (see ANATOMY-REPORT.md), and original artwork has no
// licence to satisfy, no attribution to carry, and no third party who can
// revoke it later.
//
// House style, applied by the primitives below so every diagram agrees:
//   • bone      warm ivory, dark outline — the structural anchor
//   • cartilage cool blue-grey — the cushion between bones
//   • ligament  amber band — what connects bone to bone
//   • tendon    pale straw — what connects muscle to bone
//   • muscle    muted rose
//   • marker    magenta, reserved for pathology (pain, tear, trigger point)
//   • motion    indigo arrows, reserved for movement
//
// Everything is muted on purpose. The artwork is a substrate a trainer draws
// ON TOP OF, so it must never out-shout their ink.

export const C = {
  bone: '#F4EDE1',
  boneEdge: '#8A7E6B',
  boneShade: '#E4D9C6',
  cartilage: '#BFD4E0',
  cartilageEdge: '#7E9AAB',
  ligament: '#E9B872',
  ligamentEdge: '#B8862F',
  tendon: '#EFE3C0',
  muscle: '#D98C8C',
  muscleEdge: '#A85F5F',
  marker: '#E11D74',
  motion: '#4F46E5',
  ink: '#334155',
  faint: '#94A3B8',
  skin: '#CBD5E1',
  skinEdge: '#94A3B8',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Closed shape from a path string. */
export const bone = (d, extra = '') =>
  `<path d="${d}" fill="${C.bone}" stroke="${C.boneEdge}" stroke-width="2" stroke-linejoin="round" ${extra}/>`;

export const boneShade = (d) =>
  `<path d="${d}" fill="${C.boneShade}" stroke="none" opacity="0.9"/>`;

export const cartilage = (d) =>
  `<path d="${d}" fill="${C.cartilage}" stroke="${C.cartilageEdge}" stroke-width="1.5" stroke-linejoin="round"/>`;

export const ligament = (d, w = 9) =>
  `<path d="${d}" fill="none" stroke="${C.ligament}" stroke-width="${w}" stroke-linecap="round"/>`
  + `<path d="${d}" fill="none" stroke="${C.ligamentEdge}" stroke-width="${w}" stroke-linecap="round" opacity="0.35"/>`;

export const ligamentBody = (d) =>
  `<path d="${d}" fill="${C.ligament}" stroke="${C.ligamentEdge}" stroke-width="1.5" stroke-linejoin="round"/>`;

export const muscle = (d) =>
  `<path d="${d}" fill="${C.muscle}" stroke="${C.muscleEdge}" stroke-width="1.5" stroke-linejoin="round" opacity="0.85"/>`;

export const tendon = (d) =>
  `<path d="${d}" fill="${C.tendon}" stroke="${C.boneEdge}" stroke-width="1.2" stroke-linejoin="round"/>`;

export const ell = (cx, cy, rx, ry, fill = C.bone, stroke = C.boneEdge, extra = '') =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="2" ${extra}/>`;

/** A leader line + text. Labels are what turn a shape into a teaching aid. */
export const label = (x, y, text, { anchor = 'start', to = null, size = 13 } = {}) => {
  const line = to
    ? `<line x1="${x}" y1="${y}" x2="${to[0]}" y2="${to[1]}" stroke="${C.faint}" stroke-width="1.2" stroke-dasharray="3 2"/>`
      + `<circle cx="${to[0]}" cy="${to[1]}" r="2.5" fill="${C.faint}"/>`
    : '';
  return `${line}<text x="${x}" y="${y}" font-family="system-ui,-apple-system,sans-serif" font-size="${size}" font-weight="600" fill="${C.ink}" text-anchor="${anchor}">${esc(text)}</text>`;
};

/** Movement arrow. Reserved for the exercise pack and ROM diagrams. */
export const arrow = (d, colour = C.motion, w = 5) =>
  `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" marker-end="url(#arrowhead)"/>`;

/** Curved range-of-motion sweep with a degree readout. */
export const romArc = (cx, cy, r, a0, a1, text) => {
  const pt = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = pt(a0);
  const [x1, y1] = pt(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const [tx, ty] = pt((a0 + a1) / 2);
  return `<path d="M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}" fill="none" stroke="${C.motion}" stroke-width="4" stroke-linecap="round" marker-end="url(#arrowhead)"/>`
    + `<line x1="${cx}" y1="${cy}" x2="${x0}" y2="${y0}" stroke="${C.faint}" stroke-width="1.2" stroke-dasharray="4 3"/>`
    + `<line x1="${cx}" y1="${cy}" x2="${x1}" y2="${y1}" stroke="${C.faint}" stroke-width="1.2" stroke-dasharray="4 3"/>`
    + (text ? label(tx + (tx > cx ? 8 : -8), ty, text, { anchor: tx > cx ? 'start' : 'end', size: 12 }) : '');
};

/** Pathology marker — concentric rings. Used for pain sites and trigger points. */
export const hotspot = (cx, cy, r = 10, text = null) =>
  `<circle cx="${cx}" cy="${cy}" r="${r * 1.9}" fill="${C.marker}" opacity="0.14"/>`
  + `<circle cx="${cx}" cy="${cy}" r="${r * 1.3}" fill="${C.marker}" opacity="0.22"/>`
  + `<circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="${C.marker}"/>`
  + (text ? label(cx + r * 2.2, cy + 4, text, { size: 12 }) : '');

/** A tear/lesion mark — short jagged stroke. */
export const tear = (cx, cy, s = 12) =>
  `<path d="M${cx - s} ${cy} l${s * 0.5} ${-s * 0.45} l${s * 0.25} ${s * 0.5} l${s * 0.6} ${-s * 0.55} l${s * 0.3} ${s * 0.5}"
     fill="none" stroke="${C.marker}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Simple coaching stick figure. Joint coordinates drive every exercise pose. */
export const figure = (j, { stroke = C.skinEdge, fill = C.skin, w = 13 } = {}) => {
  const seg = (a, b) =>
    `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${fill}" stroke-width="${w}" stroke-linecap="round"/>`
    + `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" opacity="0.25"/>`;
  return [
    seg(j.shoulder, j.hip),
    seg(j.shoulder, j.elbow), seg(j.elbow, j.wrist),
    seg(j.hip, j.knee), seg(j.knee, j.ankle),
    j.ankle && j.toe ? seg(j.ankle, j.toe) : '',
    `<circle cx="${j.head[0]}" cy="${j.head[1]}" r="17" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`,
  ].join('');
};

/** Wrap diagram body into a complete, self-contained SVG document. */
export function svgDoc({ viewBox, width, height, title, body, note = null }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  <metadata>${esc(title)}. Original artwork created for this application. No third-party licence applies.</metadata>
  <defs>
    <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="${C.motion}"/>
    </marker>
  </defs>
  <g>
${body}
  </g>
${note ? `  <text x="50%" y="98%" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="${C.faint}">${esc(note)}</text>` : ''}
</svg>
`;
}
