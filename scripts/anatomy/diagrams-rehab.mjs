// Packs 6–7: rehab overlays and exercise-form diagrams. Original artwork.
//
// The exercise plates are deliberately stick figures. That is how coaching
// diagrams are actually drawn — a photoreal body obscures the joint angles
// that matter, and the point of these is to show WHERE the hinge is and WHICH
// WAY things travel. Movement arrows are the content; the figure is scaffolding.

import {
  C, label, romArc, hotspot, tear, figure, arrow, svgDoc, muscle,
} from './draw.mjs';

// Gender-neutral body outline used by the pain / trigger-point overlays.
// Simplified silhouette so marks placed on it read unambiguously.
function bodyOutline(cx = 200, { back = false } = {}) {
  return `<path d="M${cx} 30
      q26 0 26 26 q0 20 -12 28 l0 10 q34 8 46 30 l14 74 q2 16 -12 18 q-14 2 -18 -12 l-10 -40 l-6 84
      l10 116 q2 14 -8 16 l-6 92 q2 16 -14 16 q-16 0 -16 -16 l-4 -88 l-4 88 q0 16 -16 16 q-16 0 -14 -16
      l-6 -92 q-10 -2 -8 -16 l10 -116 l-6 -84 l-10 40 q-4 14 -18 12 q-14 -2 -12 -18 l14 -74
      q12 -22 46 -30 l0 -10 q-12 -8 -12 -28 q0 -26 26 -26 z"
      fill="${C.skin}" stroke="${C.skinEdge}" stroke-width="2.5" stroke-linejoin="round" opacity="${back ? 0.9 : 1}"/>`;
}

export const rehab = {
  'pain-map-front': {
    category: 'injuries', bodyPart: 'pain-map', title: 'Pain map — anterior',
    viewBox: '0 0 400 620', width: 320, height: 496,
    render() {
      return [
        bodyOutline(),
        label(200, 22, 'Mark where it hurts', { anchor: 'middle', size: 13 }),
        // Common anterior sites, faint so the trainer's own marks dominate.
        `<g opacity="0.5">`,
        hotspot(200, 118, 7), hotspot(158, 172, 7), hotspot(242, 172, 7),
        hotspot(200, 250, 7), hotspot(168, 330, 7), hotspot(232, 330, 7),
        hotspot(176, 430, 7), hotspot(224, 430, 7),
        `</g>`,
        label(30, 118, 'Neck', { to: [186, 118], anchor: 'start', size: 12 }),
        label(30, 176, 'Shoulder', { to: [148, 172], anchor: 'start', size: 12 }),
        label(370, 250, 'Lumbar / core', { to: [214, 250], anchor: 'end', size: 12 }),
        label(30, 334, 'Hip / groin', { to: [158, 330], anchor: 'start', size: 12 }),
        label(370, 434, 'Knee', { to: [236, 430], anchor: 'end', size: 12 }),
      ].join('');
    },
  },

  'pain-map-back': {
    category: 'injuries', bodyPart: 'pain-map', title: 'Pain map — posterior',
    viewBox: '0 0 400 620', width: 320, height: 496,
    render() {
      return [
        bodyOutline(200, { back: true }),
        label(200, 22, 'Mark where it hurts', { anchor: 'middle', size: 13 }),
        `<g opacity="0.5">`,
        hotspot(200, 130, 7), hotspot(164, 186, 7), hotspot(236, 186, 7),
        hotspot(200, 268, 7), hotspot(200, 316, 7),
        hotspot(172, 386, 7), hotspot(228, 386, 7), hotspot(180, 500, 7), hotspot(220, 500, 7),
        `</g>`,
        label(30, 130, 'Cervical', { to: [186, 130], anchor: 'start', size: 12 }),
        label(30, 190, 'Scapula', { to: [152, 186], anchor: 'start', size: 12 }),
        label(370, 268, 'Thoracolumbar', { to: [214, 268], anchor: 'end', size: 12 }),
        label(370, 320, 'SI joint', { to: [214, 316], anchor: 'end', size: 12 }),
        label(30, 390, 'Glute', { to: [160, 386], anchor: 'start', size: 12 }),
        label(370, 504, 'Calf', { to: [234, 500], anchor: 'end', size: 12 }),
      ].join('');
    },
  },

  'trigger-points': {
    category: 'injuries', bodyPart: 'trigger-points', title: 'Common trigger points — posterior',
    viewBox: '0 0 400 620', width: 320, height: 496,
    render() {
      const pts = [
        [178, 128], [222, 128], [162, 168], [238, 168],
        [178, 208], [222, 208], [186, 262], [214, 262],
        [172, 300], [228, 300], [180, 372], [220, 372],
        [176, 470], [224, 470], [184, 520], [216, 520],
      ];
      return [
        bodyOutline(200, { back: true }),
        label(200, 22, 'Palpation reference — confirm on the client', { anchor: 'middle', size: 12 }),
        ...pts.map(([x, y]) => `<g opacity="0.85">${hotspot(x, y, 6)}</g>`),
        label(30, 128, 'Upper trapezius', { to: [166, 128], anchor: 'start', size: 12 }),
        label(370, 168, 'Levator scapulae', { to: [250, 168], anchor: 'end', size: 12 }),
        label(30, 212, 'Rhomboids', { to: [166, 208], anchor: 'start', size: 12 }),
        label(370, 300, 'Quadratus lumborum', { to: [240, 300], anchor: 'end', size: 12 }),
        label(30, 376, 'Gluteus medius', { to: [168, 372], anchor: 'start', size: 12 }),
        label(370, 474, 'Gastrocnemius', { to: [236, 470], anchor: 'end', size: 12 }),
      ].join('');
    },
  },

  'rom-shoulder': {
    category: 'injuries', bodyPart: 'rom', title: 'ROM — shoulder',
    viewBox: '0 0 440 440', width: 380, height: 380,
    render() {
      const sx = 190, sy = 190;
      return [
        `<circle cx="${sx}" cy="${sy}" r="16" fill="${C.skin}" stroke="${C.skinEdge}" stroke-width="2.5"/>`,
        `<line x1="${sx}" y1="${sy}" x2="${sx}" y2="${sy + 150}" stroke="${C.skin}" stroke-width="13" stroke-linecap="round"/>`,
        `<line x1="${sx}" y1="${sy}" x2="${sx}" y2="${sy + 150}" stroke="${C.skinEdge}" stroke-width="13" stroke-linecap="round" opacity="0.25"/>`,
        romArc(sx, sy, 130, 90, -60, '180° flexion'),
        romArc(sx, sy, 96, 90, 150, '60° extension'),
        label(sx, 40, 'Normal shoulder range', { anchor: 'middle', size: 13 }),
        label(30, 410, 'Record actual against normal; shade the deficit.', { anchor: 'start', size: 12 }),
      ].join('');
    },
  },

  'rom-knee': {
    category: 'injuries', bodyPart: 'rom', title: 'ROM — knee',
    viewBox: '0 0 440 440', width: 380, height: 380,
    render() {
      const kx = 170, ky = 210;
      return [
        `<line x1="${kx}" y1="60" x2="${kx}" y2="${ky}" stroke="${C.skin}" stroke-width="15" stroke-linecap="round"/>`,
        `<line x1="${kx}" y1="60" x2="${kx}" y2="${ky}" stroke="${C.skinEdge}" stroke-width="15" stroke-linecap="round" opacity="0.25"/>`,
        `<circle cx="${kx}" cy="${ky}" r="17" fill="${C.skin}" stroke="${C.skinEdge}" stroke-width="2.5"/>`,
        `<line x1="${kx}" y1="${ky}" x2="${kx}" y2="${ky + 140}" stroke="${C.skin}" stroke-width="14" stroke-linecap="round" opacity="0.4"/>`,
        `<line x1="${kx}" y1="${ky}" x2="${kx + 118}" y2="${ky + 78}" stroke="${C.skin}" stroke-width="14" stroke-linecap="round"/>`,
        `<line x1="${kx}" y1="${ky}" x2="${kx + 118}" y2="${ky + 78}" stroke="${C.skinEdge}" stroke-width="14" stroke-linecap="round" opacity="0.25"/>`,
        romArc(kx, ky, 118, 90, 33, '135° flexion'),
        label(kx, 40, 'Normal knee range', { anchor: 'middle', size: 13 }),
        label(30, 410, '0° = full extension. Note any extension lag.', { anchor: 'start', size: 12 }),
      ].join('');
    },
  },

  'injury-overlay': {
    category: 'injuries', bodyPart: 'injury', title: 'Injury overlay — grading key',
    viewBox: '0 0 440 400', width: 380, height: 345,
    render() {
      const row = (y, n, text) => [
        `<circle cx="70" cy="${y}" r="20" fill="${C.marker}" opacity="${0.18 + n * 0.26}"/>`,
        `<circle cx="70" cy="${y}" r="7" fill="${C.marker}"/>`,
        label(110, y + 5, text, { size: 13 }),
      ].join('');
      return [
        label(220, 44, 'Injury marking key', { anchor: 'middle', size: 15 }),
        row(100, 0, 'Grade I — mild, minimal loss of function'),
        row(160, 1, 'Grade II — partial tear, some instability'),
        row(220, 2, 'Grade III — complete tear, refer on'),
        tear(70, 290, 16),
        label(110, 296, 'Tear / rupture marker'),
        `<line x1="50" y1="336" x2="90" y2="336" stroke="${C.motion}" stroke-width="5" stroke-linecap="round" marker-end="url(#arrowhead)"/>`,
        label(110, 341, 'Direction of pain referral'),
      ].join('');
    },
  },
};

// ── PACK 7: EXERCISE FORM ───────────────────────────────────────────────────
//
// Each plate shows start and end position side by side plus the travel path,
// because form is a transition, not a pose.

const ex = (id, title, bodyPart, start, end, arrows, cues) => ({
  category: 'exercises', bodyPart, title,
  viewBox: '0 0 620 500', width: 500, height: 403,
  render() {
    return [
      `<text x="150" y="40" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${C.faint}" text-anchor="middle">START</text>`,
      `<text x="450" y="40" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${C.faint}" text-anchor="middle">END</text>`,
      `<line x1="310" y1="60" x2="310" y2="400" stroke="${C.faint}" stroke-width="1" stroke-dasharray="5 5" opacity="0.5"/>`,
      figure(start),
      figure(end),
      arrows(),
      ...cues.map((c, i) => label(30, 420 + i * 20, `• ${c}`, { anchor: 'start', size: 12 })),
    ].join('');
  },
});

// Joint sets. y grows downward; x offset picks the START/END column.
const squatStart = (x) => ({
  head: [x, 110], shoulder: [x, 150], elbow: [x + 34, 186], wrist: [x + 44, 226],
  hip: [x, 250], knee: [x + 6, 320], ankle: [x, 386], toe: [x + 30, 392],
});
const squatEnd = (x) => ({
  head: [x - 14, 176], shoulder: [x - 8, 216], elbow: [x + 30, 242], wrist: [x + 40, 276],
  hip: [x + 18, 300], knee: [x - 22, 336], ankle: [x, 386], toe: [x + 30, 392],
});

export const exercises = {
  'exercise-squat': ex('squat', 'Squat — form', 'squat',
    squatStart(150), squatEnd(450),
    () => arrow('M240 250 q60 40 130 60') + arrow('M470 320 q26 -46 10 -96', C.motion, 4),
    ['Hips travel back and down, not straight down',
     'Knees track over toes — do not let them collapse inward',
     'Neutral spine throughout; chest stays proud']),

  'exercise-bench-press': ex('bench', 'Bench press — form', 'bench-press',
    { head: [96, 250], shoulder: [140, 250], elbow: [140, 190], wrist: [140, 140], hip: [230, 254], knee: [290, 290], ankle: [300, 360], toe: [330, 366] },
    { head: [396, 250], shoulder: [440, 250], elbow: [472, 210], wrist: [440, 176], hip: [530, 254], knee: [590, 290], ankle: [600, 360], toe: [620, 366] },
    () => arrow('M440 168 v-38', C.motion, 5)
      + `<rect x="100" y="132" width="90" height="9" rx="4" fill="${C.ink}"/>`
      + `<rect x="400" y="168" width="90" height="9" rx="4" fill="${C.ink}"/>`,
    ['Bar path is over the mid-chest, not the throat',
     'Elbows ~45° from the torso, not flared to 90°',
     'Shoulder blades retracted and pinned to the bench']),

  'exercise-deadlift': ex('deadlift', 'Deadlift — form', 'deadlift',
    { head: [136, 176], shoulder: [150, 216], elbow: [156, 268], wrist: [158, 320], hip: [186, 288], knee: [168, 336], ankle: [160, 390], toe: [190, 396] },
    { head: [450, 110], shoulder: [450, 152], elbow: [456, 210], wrist: [458, 262], hip: [452, 252], knee: [450, 322], ankle: [450, 390], toe: [480, 396] },
    () => arrow('M250 300 q60 -60 130 -110')
      + `<rect x="118" y="318" width="82" height="9" rx="4" fill="${C.ink}"/>`
      + `<rect x="418" y="260" width="82" height="9" rx="4" fill="${C.ink}"/>`,
    ['Bar stays in contact with the legs the whole way',
     'Hips and shoulders rise together — hips must not shoot first',
     'Lock out by squeezing glutes, not by leaning back']),

  'exercise-pull-up': ex('pullup', 'Pull up — form', 'pull-up',
    { head: [150, 190], shoulder: [150, 228], elbow: [150, 172], wrist: [150, 116], hip: [150, 300], knee: [156, 366], ankle: [150, 424], toe: [176, 428] },
    { head: [450, 140], shoulder: [450, 178], elbow: [412, 156], wrist: [450, 116], hip: [450, 250], knee: [458, 318], ankle: [450, 380], toe: [476, 384] },
    () => arrow('M310 300 v-90')
      + `<rect x="70" y="108" width="480" height="9" rx="4" fill="${C.ink}"/>`,
    ['Lead with the chest, drive elbows down and back',
     'Full hang at the bottom — no bouncing out of it',
     'Chin clears the bar without craning the neck']),

  'exercise-push-up': ex('pushup', 'Push up — form', 'push-up',
    { head: [86, 268], shoulder: [130, 280], elbow: [134, 330], wrist: [136, 380], hip: [220, 300], knee: [280, 336], ankle: [330, 376], toe: [352, 384] },
    { head: [386, 320], shoulder: [430, 330], elbow: [462, 356], wrist: [436, 380], hip: [520, 336], knee: [578, 358], ankle: [612, 380], toe: [620, 388] },
    () => arrow('M300 320 q40 24 90 34', C.motion, 4)
      + `<line x1="70" y1="392" x2="620" y2="392" stroke="${C.faint}" stroke-width="2"/>`,
    ['Body is one straight line from head to heels',
     'Hips must not sag or pike up',
     'Elbows ~45°, hands under the shoulders']),

  'exercise-shoulder-press': ex('press', 'Shoulder press — form', 'shoulder-press',
    { head: [150, 130], shoulder: [150, 176], elbow: [110, 216], wrist: [150, 250], hip: [150, 290], knee: [150, 360], ankle: [150, 424], toe: [178, 430] },
    { head: [450, 130], shoulder: [450, 176], elbow: [450, 128], wrist: [450, 72], hip: [450, 290], knee: [450, 360], ankle: [450, 424], toe: [478, 430] },
    () => arrow('M450 244 v-152')
      + `<rect x="110" y="244" width="82" height="9" rx="4" fill="${C.ink}"/>`
      + `<rect x="410" y="64" width="82" height="9" rx="4" fill="${C.ink}"/>`,
    ['Ribs down — do not arch the lower back to finish the rep',
     'Bar finishes over the mid-foot, not in front of the face',
     'Glutes and abs braced throughout']),

  'exercise-lunge': ex('lunge', 'Lunge — form', 'lunge',
    { head: [150, 120], shoulder: [150, 160], elbow: [150, 214], wrist: [150, 262], hip: [150, 260], knee: [150, 330], ankle: [150, 396], toe: [178, 402] },
    { head: [450, 150], shoulder: [450, 190], elbow: [450, 240], wrist: [450, 288], hip: [450, 288], knee: [512, 336], ankle: [512, 400], toe: [540, 404] },
    () => arrow('M300 280 q50 20 96 40', C.motion, 4)
      + `<line x1="380" y1="336" x2="470" y2="336" stroke="${C.marker}" stroke-width="2.5" stroke-dasharray="5 4"/>`
      + label(300, 332, 'rear knee to floor', { anchor: 'end', size: 11 }),
    ['Front shin close to vertical, knee over the ankle',
     'Torso upright — do not fold over the front leg',
     'Rear knee tracks down, not forward']),

  'exercise-hip-hinge': ex('hinge', 'Hip hinge — form', 'hip-hinge',
    { head: [150, 120], shoulder: [150, 162], elbow: [150, 214], wrist: [150, 266], hip: [150, 262], knee: [150, 332], ankle: [150, 398], toe: [178, 404] },
    { head: [386, 206], shoulder: [420, 218], elbow: [430, 268], wrist: [434, 318], hip: [500, 250], knee: [488, 330], ankle: [480, 398], toe: [508, 404] },
    () => arrow('M300 260 q46 8 84 -6', C.motion, 4)
      + arrow('M520 250 q34 -6 44 -30', C.motion, 4)
      + label(606, 210, 'hips back', { anchor: 'end', size: 11 }),
    ['Movement comes from the hips, not the lower back',
     'Soft knees, but this is not a squat — minimal knee bend',
     'Spine stays neutral; stop when the hamstrings tension out']),
};
