// Generate the anatomy overlay artwork + manifest from vendored geometry.
//
// Produces real, self-contained SVG files under public/anatomy/ plus
// anatomy-manifest.json describing every asset with its licence provenance.
//
// Run: npm run build:anatomy   (also runs on postinstall)
//
// ── Why generated rather than committed ─────────────────────────────────────
// The geometry is 66 polygons of source data; the rendered artwork is ~60
// files derived from it deterministically. Generating means a change to the
// palette or the muscle grouping is one edit here rather than 60 hand-edited
// files that silently drift apart.
//
// ── Licence ─────────────────────────────────────────────────────────────────
// Geometry: body-highlighter@3.0.2, MIT, Copyright (c) 2020 GV79.
// MIT requires the copyright notice to travel with the work, so every emitted
// SVG carries it in a <metadata> block and ATTRIBUTION.md is written alongside.

import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const OUT = path.join(root, 'public', 'anatomy');

const geometry = JSON.parse(await readFile(path.join(here, 'geometry.json'), 'utf8'));
const { viewBox, anterior, posterior, _provenance: PROV } = geometry;

// Palette. Muted slate for inactive tissue so a trainer's ink reads clearly on
// top; a saturated accent only for the highlighted group. Deliberately NOT
// anatomical red — the artwork is a substrate to draw on, not the subject.
const BODY_FILL = '#CBD5E1';
const BODY_STROKE = '#94A3B8';
const HILITE_FILL = '#F43F5E';
const HILITE_STROKE = '#BE123C';

/** Human-readable label + the clinical grouping used by the picker. */
const MUSCLE_META = {
  CHEST:          { label: 'Chest (Pectorals)',      region: 'upper' },
  FRONT_DELTOIDS: { label: 'Front Deltoids',         region: 'upper' },
  BACK_DELTOIDS:  { label: 'Rear Deltoids',          region: 'upper' },
  BICEPS:         { label: 'Biceps',                 region: 'arms'  },
  TRICEPS:        { label: 'Triceps',                region: 'arms'  },
  FOREARM:        { label: 'Forearms',               region: 'arms'  },
  ABS:            { label: 'Abdominals',             region: 'core'  },
  OBLIQUES:       { label: 'Obliques',               region: 'core'  },
  UPPER_BACK:     { label: 'Upper Back',             region: 'back'  },
  LOWER_BACK:     { label: 'Lower Back',             region: 'back'  },
  TRAPEZIUS:      { label: 'Trapezius',              region: 'back'  },
  GLUTEAL:        { label: 'Glutes',                 region: 'lower' },
  QUADRICEPS:     { label: 'Quadriceps',             region: 'lower' },
  HAMSTRING:      { label: 'Hamstrings',             region: 'lower' },
  CALVES:         { label: 'Calves (Gastrocnemius)', region: 'lower' },
  LEFT_SOLEUS:    { label: 'Left Soleus',            region: 'lower' },
  RIGHT_SOLEUS:   { label: 'Right Soleus',           region: 'lower' },
  ADDUCTOR:       { label: 'Adductors',              region: 'lower' },
  ABDUCTORS:      { label: 'Abductors',              region: 'lower' },
  KNEES:          { label: 'Knees',                  region: 'joints' },
  NECK:           { label: 'Neck',                   region: 'upper' },
  HEAD:           { label: 'Head',                   region: 'other' },
};

const slug = (k) => k.toLowerCase().replace(/_/g, '-');

/**
 * One self-contained SVG. `highlight` names the muscle drawn in the accent
 * colour; null renders the plain body.
 *
 * Self-contained matters: these are inserted into a canvas and exported to
 * PNG/PDF, so nothing may reference an external stylesheet or font.
 */
function renderSvg(groups, { highlight = null, title }) {
  const parts = [];
  for (const g of groups) {
    const on = highlight === g.muscle;
    const meta = MUSCLE_META[g.muscle];
    for (const points of g.polygons) {
      parts.push(
        `    <polygon points="${points}" `
        + `fill="${on ? HILITE_FILL : BODY_FILL}" `
        + `stroke="${on ? HILITE_STROKE : BODY_STROKE}" stroke-width="0.4" `
        + `data-muscle="${slug(g.muscle)}"><title>${meta?.label ?? g.muscle}</title></polygon>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="300" height="600" role="img" aria-label="${title}">
  <title>${title}</title>
  <metadata>${title}. Geometry from ${PROV.source_package} (${PROV.license}). ${PROV.copyright}. ${PROV.source_url}</metadata>
  <g>
${parts.join('\n')}
  </g>
</svg>
`;
}

await rm(OUT, { recursive: true, force: true });
for (const d of ['body', 'muscles', 'skeleton', 'joints', 'ligaments', 'injuries', 'exercises']) {
  await mkdir(path.join(OUT, d), { recursive: true });
}

const LICENCE = {
  license: PROV.license,
  author: PROV.copyright,
  source: PROV.source_url,
  commercial_use: PROV.commercial_use,
  attribution_required: PROV.attribution_required,
};

const assets = [];
const views = [
  { key: 'front', groups: anterior, label: 'Front' },
  { key: 'back', groups: posterior, label: 'Back' },
];

// ── Pack 1: full body ───────────────────────────────────────────────────────
for (const v of views) {
  const file = `body/body-${v.key}.svg`;
  const title = `Human body — ${v.label.toLowerCase()} view`;
  await writeFile(path.join(OUT, file), renderSvg(v.groups, { title }));
  assets.push({
    id: `body-${v.key}`, title, category: 'body', bodyPart: 'full-body',
    view: v.key, svg: `/anatomy/${file}`, png: null, thumbnail: `/anatomy/${file}`,
    ...LICENCE,
  });
}

// ── Pack 2: per-muscle highlights ───────────────────────────────────────────
for (const v of views) {
  for (const g of v.groups) {
    const meta = MUSCLE_META[g.muscle];
    if (!meta || meta.region === 'other') continue;
    const s = slug(g.muscle);
    const file = `muscles/${s}-${v.key}.svg`;
    const title = `${meta.label} — ${v.label.toLowerCase()} view`;
    await writeFile(path.join(OUT, file), renderSvg(v.groups, { highlight: g.muscle, title }));
    assets.push({
      id: `muscle-${s}-${v.key}`, title, category: 'muscles', bodyPart: s,
      region: meta.region, view: v.key,
      svg: `/anatomy/${file}`, png: null, thumbnail: `/anatomy/${file}`,
      ...LICENCE,
    });
  }
}

const manifest = {
  generated_at: new Date().toISOString(),
  generator: 'scripts/anatomy/build-anatomy.mjs',
  // Named honestly so nobody mistakes the coverage for a full medical library.
  coverage: {
    shipped: ['body', 'muscles'],
    empty: ['skeleton', 'joints', 'ligaments', 'injuries', 'exercises'],
    note: 'Empty categories have no legally-sourced artwork yet. See ANATOMY-REPORT.md. Directories exist so assets drop in without a code change.',
  },
  licenses: [LICENCE],
  assets,
};
await writeFile(path.join(OUT, 'anatomy-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

await writeFile(path.join(OUT, 'ATTRIBUTION.md'), `# Anatomy artwork attribution

The anatomy overlays in this application are generated from polygon geometry
originally published in **${PROV.source_package}**, used under the MIT licence.

> ${PROV.copyright}
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

Source: ${PROV.source_url}

MIT requires this notice to accompany the work, so it is emitted into every
generated SVG's \`<metadata>\` element as well as this file. Keep this file
deployed — do not strip it from the build.
`);

console.log(`[anatomy] ${assets.length} assets -> public/anatomy (${views.length} bodies, ${assets.length - views.length} muscle overlays)`);
