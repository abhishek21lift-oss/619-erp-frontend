// Packs 3–5: skeleton, joints, ligaments. Original artwork.
//
// These are clinical schematics, not rendered medical illustration. That is a
// deliberate choice, not a shortfall: the artwork is a substrate a trainer
// draws over while explaining something, so structural clarity and labelling
// matter far more than shading. Every structure a clinician would point at is
// present, in the right place, and named.

import {
  C, bone, boneShade, cartilage, ligament, ligamentBody, muscle, tendon,
  ell, label, romArc, hotspot, tear, svgDoc,
} from './draw.mjs';

// ── Reusable sub-assemblies ─────────────────────────────────────────────────

/** Vertebral column. Generated rather than drawn so the curve stays smooth. */
function spineColumn(x, yTop, yBot, n, { widthTop = 26, widthBot = 40, curve = true } = {}) {
  const out = [];
  const h = (yBot - yTop) / n;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const y = yTop + i * h;
    const w = widthTop + (widthBot - widthTop) * t;
    // Gentle S-curve: cervical lordosis forward, thoracic kyphosis back.
    const dx = curve ? Math.sin(t * Math.PI * 1.6) * 14 - 6 : 0;
    const bh = h * 0.62;
    out.push(bone(`M${x + dx - w / 2} ${y} h${w} a4 4 0 0 1 4 4 v${bh - 8} a4 4 0 0 1 -4 4 h${-w} a4 4 0 0 1 -4 -4 v${-(bh - 8)} a4 4 0 0 1 4 -4 z`));
    // Intervertebral disc
    if (i < n - 1) {
      const t2 = (i + 1) / (n - 1);
      const dx2 = curve ? Math.sin(t2 * Math.PI * 1.6) * 14 - 6 : 0;
      out.push(cartilage(`M${x + dx - w / 2 + 2} ${y + bh} h${w - 4} l${dx2 - dx} ${h - bh} h${-(w - 4)} z`));
    }
    // Spinous process
    out.push(bone(`M${x + dx + w / 2} ${y + bh * 0.35} l18 6 l-18 6 z`));
  }
  return out.join('');
}

function ribCage(cx, yTop, { pairs = 10 } = {}) {
  const out = [spineColumn(cx, yTop, yTop + 250, pairs + 2, { widthTop: 24, widthBot: 32, curve: false })];
  for (let i = 0; i < pairs; i++) {
    const y = yTop + 18 + i * 23;
    const spread = 60 + Math.sin((i / pairs) * Math.PI) * 78;
    const drop = 40 + i * 9;
    for (const s of [-1, 1]) {
      out.push(
        `<path d="M${cx + s * 16} ${y} Q${cx + s * spread} ${y + drop * 0.35} ${cx + s * (spread * 0.62)} ${y + drop}"
           fill="none" stroke="${C.boneEdge}" stroke-width="8" stroke-linecap="round" opacity="0.35"/>`
        + `<path d="M${cx + s * 16} ${y} Q${cx + s * spread} ${y + drop * 0.35} ${cx + s * (spread * 0.62)} ${y + drop}"
           fill="none" stroke="${C.bone}" stroke-width="5.5" stroke-linecap="round"/>`,
      );
    }
  }
  // Sternum
  out.push(bone(`M${cx - 14} ${yTop + 40} h28 v120 l-14 26 l-14 -26 z`));
  return out.join('');
}

/** Femur, distal end down. Shared by knee diagrams so they stay consistent. */
function femurDistal(cx, y) {
  return bone(`M${cx - 26} ${y - 130} h52 v90 q0 14 -10 22 l-8 8 q-8 8 -18 8 q-10 0 -18 -8 l-8 -8 q-10 -8 -10 -22 z`)
    + boneShade(`M${cx - 18} ${y - 122} h36 v78 h-36 z`)
    // Medial + lateral condyles
    + ell(cx - 22, y + 6, 22, 24)
    + ell(cx + 22, y + 6, 22, 24)
    + `<path d="M${cx - 4} ${y - 12} q4 18 0 30" fill="none" stroke="${C.boneEdge}" stroke-width="1.5" opacity="0.6"/>`;
}

function tibiaProximal(cx, y) {
  return bone(`M${cx - 40} ${y} q0 -10 10 -12 h60 q10 2 10 12 v34 q0 10 -8 12 l-8 96 h-48 l-8 -96 q-8 -2 -8 -12 z`)
    + boneShade(`M${cx - 26} ${y + 40} h52 v70 h-52 z`);
}

function fibulaProximal(cx, y) {
  return bone(`M${cx + 44} ${y + 22} q10 0 12 10 v100 q-2 8 -10 8 q-8 0 -10 -8 v-100 q2 -10 8 -10 z`);
}

// ── PACK 3: SKELETON ────────────────────────────────────────────────────────

export const skeletal = {
  'full-skeleton': {
    category: 'skeleton', bodyPart: 'full-skeleton', title: 'Full skeleton — anterior view',
    viewBox: '0 0 400 880', width: 300, height: 660,
    render() {
      const cx = 200;
      return [
        // Skull + jaw
        ell(cx, 62, 42, 48),
        bone(`M${cx - 26} 92 q26 26 52 0 q-4 26 -26 28 q-22 -2 -26 -28 z`),
        // Cervical spine + clavicles
        spineColumn(cx, 118, 178, 5, { widthTop: 20, widthBot: 24, curve: false }),
        bone(`M${cx - 92} 190 q46 -18 78 -4 v10 q-34 -12 -78 6 z`),
        bone(`M${cx + 92} 190 q-46 -18 -78 -4 v10 q34 -12 78 6 z`),
        // Ribs + thoracic spine
        ribCage(cx, 196, { pairs: 9 }),
        // Lumbar + pelvis
        spineColumn(cx, 420, 490, 5, { widthTop: 34, widthBot: 42, curve: false }),
        bone(`M${cx - 86} 492 q86 -22 172 0 q6 52 -34 78 q-18 12 -52 12 q-34 0 -52 -12 q-40 -26 -34 -78 z`),
        `<ellipse cx="${cx}" cy="548" rx="44" ry="30" fill="#fff" stroke="${C.boneEdge}" stroke-width="2"/>`,
        // Arms
        ...[-1, 1].map((s) => [
          bone(`M${cx + s * 96} 196 q14 0 16 14 l6 96 q-2 12 -16 12 q-14 0 -16 -12 l-6 -96 q2 -14 16 -14 z`),
          bone(`M${cx + s * 112} 322 q12 0 14 12 l8 92 q-2 10 -14 10 q-12 0 -14 -10 l-8 -92 q2 -12 14 -12 z`),
          bone(`M${cx + s * 126} 322 q10 0 12 10 l6 94 q-2 10 -12 10 q-10 0 -12 -10 l-6 -94 q2 -10 12 -10 z`),
          ell(cx + s * 130, 450, 16, 20),
          ...[0, 1, 2, 3].map((f) => bone(`M${cx + s * (118 + f * 8)} 466 v34 q0 5 -5 5 q-5 0 -5 -5 v-34 z`)),
        ].join('')),
        // Legs — femur, patella, tibia + fibula, then tarsals. A plate labelled
        // "full skeleton" that stops at the knee is simply wrong.
        ...[-1, 1].map((s) => [
          bone(`M${cx + s * 40} 566 q18 0 20 18 l3 96 q-3 12 -23 12 q-20 0 -23 -12 l3 -96 q2 -18 20 -18 z`),
          ell(cx + s * 40, 700, 22, 20),
          ell(cx + s * 40, 686, 11, 13),
          bone(`M${cx + s * 40} 712 q16 0 18 14 l3 88 q-3 10 -21 10 q-18 0 -21 -10 l3 -88 q2 -14 18 -14 z`),
          bone(`M${cx + s * 58} 720 q8 0 9 9 l2 78 q-2 8 -11 8 q-9 0 -10 -8 l2 -78 q1 -9 8 -9 z`),
          bone(`M${cx + s * 40} 828 q22 -6 34 8 q4 12 -14 14 h-34 q-12 -4 -8 -14 q6 -8 22 -8 z`),
        ].join('')),
        label(300, 62, 'Cranium', { to: [232, 60] }),
        label(300, 196, 'Clavicle', { to: [252, 190] }),
        label(300, 300, 'Ribs', { to: [258, 300] }),
        label(300, 440, 'Lumbar spine', { to: [216, 445] }),
        label(300, 520, 'Pelvis', { to: [262, 512] }),
        label(20, 380, 'Humerus', { to: [96, 300], anchor: 'start' }),
        label(20, 620, 'Femur', { to: [152, 620], anchor: 'start' }),
        label(20, 760, 'Tibia / fibula', { to: [152, 760], anchor: 'start' }),
      ].join('');
    },
  },

  spine: {
    category: 'skeleton', bodyPart: 'spine', title: 'Vertebral column — lateral view',
    viewBox: '0 0 400 700', width: 320, height: 560,
    render() {
      return [
        spineColumn(140, 40, 560, 24),
        // Sacrum + coccyx
        bone('M104 566 q36 -10 72 0 q8 46 -18 74 q-18 14 -36 0 q-26 -28 -18 -74 z'),
        bone('M128 642 q12 -6 24 0 q2 22 -12 30 q-14 -8 -12 -30 z'),
        label(250, 90, 'Cervical (C1–C7)', { to: [166, 92], anchor: 'start' }),
        label(250, 250, 'Thoracic (T1–T12)', { to: [176, 250], anchor: 'start' }),
        label(250, 460, 'Lumbar (L1–L5)', { to: [172, 460], anchor: 'start' }),
        label(250, 600, 'Sacrum', { to: [176, 596], anchor: 'start' }),
        label(30, 340, 'Intervertebral disc', { to: [116, 330], anchor: 'start' }),
      ].join('');
    },
  },

  'rib-cage': {
    category: 'skeleton', bodyPart: 'rib-cage', title: 'Rib cage — anterior view',
    viewBox: '0 0 400 420', width: 360, height: 378,
    render() {
      return [
        ribCage(200, 40, { pairs: 10 }),
        label(370, 70, 'True ribs 1–7', { to: [286, 96], anchor: 'end' }),
        label(370, 300, 'False ribs 8–12', { to: [290, 286], anchor: 'end' }),
        label(30, 200, 'Sternum', { to: [186, 150], anchor: 'start' }),
      ].join('');
    },
  },

  shoulder: {
    category: 'skeleton', bodyPart: 'shoulder', title: 'Shoulder girdle — posterior view',
    viewBox: '0 0 420 420', width: 380, height: 380,
    render() {
      return [
        // Scapula
        bone('M96 84 q120 -18 176 6 l-14 116 q-4 40 -44 58 q-30 14 -52 -8 q-44 -44 -66 -172 z'),
        boneShade('M120 104 q104 -12 140 6 l-10 92 q-4 28 -34 42 q-22 8 -38 -8 q-36 -38 -58 -132 z'),
        // Acromion + clavicle
        bone('M256 74 q40 -12 62 8 q6 16 -10 22 q-30 -14 -54 -10 z'),
        bone('M300 78 q60 -22 96 -6 v14 q-40 -12 -92 8 z'),
        // Humeral head + shaft
        ell(300, 148, 44, 42),
        bone('M270 182 q30 22 60 0 l12 178 q-6 16 -42 16 q-36 0 -42 -16 z'),
        cartilage('M266 118 q34 -20 68 0 q6 30 -34 32 q-40 -2 -34 -32 z'),
        label(60, 60, 'Scapula', { to: [150, 110], anchor: 'start' }),
        label(400, 60, 'Clavicle', { to: [350, 78], anchor: 'end' }),
        label(400, 150, 'Humeral head', { to: [332, 146], anchor: 'end' }),
        label(400, 330, 'Humerus', { to: [340, 320], anchor: 'end' }),
        label(60, 250, 'Glenoid fossa', { to: [262, 150], anchor: 'start' }),
      ].join('');
    },
  },

  pelvis: {
    category: 'skeleton', bodyPart: 'pelvis', title: 'Pelvis — anterior view',
    viewBox: '0 0 460 380', width: 400, height: 330,
    render() {
      return [
        bone('M40 90 q60 -46 150 -30 q26 6 40 30 q14 -24 40 -30 q90 -16 150 30 q10 84 -46 130 q-30 26 -66 22 q-24 -4 -34 -26 q-6 -14 -44 -14 q-38 0 -44 14 q-10 22 -34 26 q-36 4 -66 -22 q-56 -46 -46 -130 z'),
        boneShade('M76 116 q52 -32 116 -20 v56 q-4 30 -44 40 q-34 8 -58 -14 q-26 -24 -14 -62 z'),
        boneShade('M384 116 q-52 -32 -116 -20 v56 q4 30 44 40 q34 8 58 -14 q26 -24 14 -62 z'),
        bone('M196 210 q34 -10 68 0 q10 48 -14 76 q-20 18 -40 0 q-24 -28 -14 -76 z'),
        `<ellipse cx="230" cy="196" rx="46" ry="26" fill="#fff" stroke="${C.boneEdge}" stroke-width="2"/>`,
        ell(78, 172, 30, 30, C.cartilage, C.cartilageEdge),
        ell(382, 172, 30, 30, C.cartilage, C.cartilageEdge),
        label(30, 60, 'Iliac crest', { to: [96, 84], anchor: 'start' }),
        label(430, 60, 'Ilium', { to: [372, 96], anchor: 'end' }),
        label(30, 300, 'Acetabulum', { to: [78, 176], anchor: 'start' }),
        label(430, 300, 'Pubic symphysis', { to: [246, 214], anchor: 'end' }),
        label(230, 350, 'Sacrum', { to: [230, 200], anchor: 'middle' }),
      ].join('');
    },
  },

  femur: {
    category: 'skeleton', bodyPart: 'femur', title: 'Femur — anterior view',
    viewBox: '0 0 260 640', width: 240, height: 590,
    render() {
      return [
        ell(88, 66, 40, 38),
        bone('M104 96 q26 22 44 40 l14 30 q-30 20 -52 -4 z'),
        bone('M150 60 q26 -6 32 16 q4 24 -18 30 q-24 2 -28 -18 z'),
        bone('M126 156 q34 -8 42 14 l14 330 q-6 18 -34 18 q-28 0 -34 -18 l14 -330 q-6 -22 -2 -14 z'),
        boneShade('M136 200 h32 l10 260 h-52 z'),
        ell(120, 552, 32, 34),
        ell(184, 552, 32, 34),
        label(230, 60, 'Head', { to: [110, 62], anchor: 'end' }),
        label(230, 100, 'Greater trochanter', { to: [178, 76], anchor: 'end' }),
        label(20, 340, 'Shaft (diaphysis)', { to: [140, 340], anchor: 'start' }),
        label(230, 560, 'Condyles', { to: [200, 552], anchor: 'end' }),
      ].join('');
    },
  },

  knee: {
    category: 'skeleton', bodyPart: 'knee', title: 'Knee — anterior view',
    viewBox: '0 0 340 480', width: 300, height: 424,
    render() {
      const cx = 160;
      return [
        femurDistal(cx, 190),
        cartilage(`M${cx - 46} 214 q46 -16 92 0 q4 16 -12 20 h-68 q-16 -4 -12 -20 z`),
        tibiaProximal(cx, 238),
        fibulaProximal(cx, 238),
        ell(cx, 176, 26, 32, C.bone, C.boneEdge, 'opacity="0.95"'),
        label(310, 120, 'Femur', { to: [192, 110], anchor: 'end' }),
        label(310, 176, 'Patella', { to: [186, 176], anchor: 'end' }),
        label(310, 222, 'Articular cartilage', { to: [200, 222], anchor: 'end' }),
        label(310, 300, 'Tibia', { to: [190, 300], anchor: 'end' }),
        label(20, 300, 'Fibula', { to: [206, 296], anchor: 'start' }),
      ].join('');
    },
  },

  foot: {
    category: 'skeleton', bodyPart: 'foot', title: 'Foot — dorsal view',
    viewBox: '0 0 340 460', width: 300, height: 406,
    render() {
      const out = [
        bone('M120 400 q40 -22 80 0 q10 34 -40 42 q-50 -8 -40 -42 z'),
        bone('M116 352 q44 -20 88 0 q6 32 -44 36 q-50 -4 -44 -36 z'),
        bone('M112 300 q48 -18 96 0 q4 34 -48 38 q-52 -4 -48 -38 z'),
      ];
      for (let i = 0; i < 5; i++) {
        const x = 84 + i * 30;
        const len = 90 - Math.abs(i - 1) * 10;
        out.push(bone(`M${x - 9} 290 q9 -6 18 0 v${-len} q-9 -8 -18 0 z`));
        out.push(bone(`M${x - 8} ${290 - len - 4} q8 -6 16 0 v-32 q-8 -6 -16 0 z`));
        out.push(bone(`M${x - 7} ${290 - len - 40} q7 -5 14 0 v-26 q-7 -5 -14 0 z`));
      }
      out.push(label(320, 150, 'Phalanges', { to: [190, 150], anchor: 'end' }));
      out.push(label(320, 250, 'Metatarsals', { to: [190, 250], anchor: 'end' }));
      out.push(label(320, 320, 'Tarsals', { to: [200, 314], anchor: 'end' }));
      out.push(label(320, 420, 'Calcaneus', { to: [186, 420], anchor: 'end' }));
      return out.join('');
    },
  },

  hand: {
    category: 'skeleton', bodyPart: 'hand', title: 'Hand — dorsal view',
    viewBox: '0 0 340 460', width: 300, height: 406,
    render() {
      const out = [
        bone('M104 372 q56 -22 112 0 q10 32 -56 40 q-66 -8 -56 -40 z'),
        bone('M108 330 q52 -18 104 0 q4 26 -52 32 q-56 -6 -52 -32 z'),
      ];
      for (let i = 0; i < 4; i++) {
        const x = 96 + i * 32;
        const len = 96 - Math.abs(i - 1) * 8;
        out.push(bone(`M${x - 10} 326 q10 -6 20 0 v${-len} q-10 -8 -20 0 z`));
        out.push(bone(`M${x - 9} ${326 - len - 4} q9 -6 18 0 v-46 q-9 -6 -18 0 z`));
        out.push(bone(`M${x - 8} ${326 - len - 54} q8 -5 16 0 v-34 q-8 -5 -16 0 z`));
      }
      out.push(bone('M92 342 q-26 -12 -40 -34 q-8 -16 6 -24 q16 -6 26 10 l20 34 z'));
      out.push(bone('M46 292 q-20 -14 -26 -34 q-4 -16 12 -20 q14 -2 20 14 l12 32 z'));
      out.push(label(320, 120, 'Phalanges', { to: [200, 130], anchor: 'end' }));
      out.push(label(320, 250, 'Metacarpals', { to: [190, 250], anchor: 'end' }));
      out.push(label(320, 350, 'Carpals', { to: [206, 344], anchor: 'end' }));
      out.push(label(20, 250, 'Thumb', { to: [60, 288], anchor: 'start' }));
      return out.join('');
    },
  },
};

// ── PACK 4: JOINTS ──────────────────────────────────────────────────────────

export const joints = {
  'joint-shoulder': {
    category: 'joints', bodyPart: 'shoulder', title: 'Shoulder joint — ball and socket',
    viewBox: '0 0 420 400', width: 380, height: 362,
    render() {
      return [
        bone('M60 70 q110 -14 156 10 l-12 106 q-6 34 -44 46 q-28 10 -48 -8 q-40 -40 -52 -154 z'),
        cartilage('M212 96 q28 -14 40 34 q10 46 -30 62 q-30 8 -34 -30 q-4 -44 24 -66 z'),
        ell(286, 152, 52, 50),
        bone('M252 190 q34 26 68 0 l14 168 q-8 14 -48 14 q-40 0 -48 -14 z'),
        ligament('M244 96 q46 -22 76 0', 8),
        ligament('M244 208 q46 22 76 0', 8),
        romArc(286, 152, 116, -120, -20, '180° flexion'),
        label(40, 46, 'Scapula', { to: [130, 100], anchor: 'start' }),
        label(400, 100, 'Glenoid labrum', { to: [238, 130], anchor: 'end' }),
        label(400, 152, 'Humeral head', { to: [322, 152], anchor: 'end' }),
        label(400, 340, 'Humerus', { to: [332, 320], anchor: 'end' }),
        label(40, 250, 'Joint capsule', { to: [258, 208], anchor: 'start' }),
      ].join('');
    },
  },

  'joint-elbow': {
    category: 'joints', bodyPart: 'elbow', title: 'Elbow joint — hinge',
    viewBox: '0 0 380 440', width: 330, height: 382,
    render() {
      return [
        bone('M150 20 q34 0 38 22 v128 q-2 18 -38 18 q-36 0 -38 -18 v-128 q4 -22 38 -22 z'),
        ell(128, 196, 30, 28),
        ell(174, 194, 26, 24),
        cartilage('M100 214 q52 -18 100 0 q4 18 -14 22 h-72 q-18 -4 -14 -22 z'),
        bone('M104 240 q28 -12 52 0 l10 172 q-6 12 -32 12 q-26 0 -30 -12 z'),
        bone('M166 238 q24 -10 44 0 l6 174 q-4 12 -28 12 q-24 0 -28 -12 z'),
        ligament('M96 196 q-16 34 8 60', 8),
        ligament('M206 194 q16 34 -8 60', 8),
        romArc(140, 210, 132, 20, 140, '145° flexion'),
        label(360, 90, 'Humerus', { to: [192, 90], anchor: 'end' }),
        label(360, 216, 'Trochlea', { to: [178, 210], anchor: 'end' }),
        label(20, 300, 'Ulna', { to: [120, 300], anchor: 'start' }),
        label(360, 330, 'Radius', { to: [196, 330], anchor: 'end' }),
        label(20, 190, 'Collateral ligament', { to: [96, 214], anchor: 'start' }),
      ].join('');
    },
  },

  'joint-wrist': {
    category: 'joints', bodyPart: 'wrist', title: 'Wrist joint — condyloid',
    viewBox: '0 0 380 400', width: 340, height: 358,
    render() {
      const out = [
        bone('M120 20 q30 0 34 20 v140 q-4 16 -34 16 q-30 0 -34 -16 v-140 q4 -20 34 -20 z'),
        bone('M196 24 q26 0 30 18 v138 q-4 14 -30 14 q-26 0 -30 -14 v-138 q4 -18 30 -18 z'),
        cartilage('M78 190 q78 -22 152 0 q4 18 -16 22 h-120 q-20 -4 -16 -22 z'),
      ];
      // Two carpal rows
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 4; i++) {
          out.push(ell(96 + i * 36, 234 + r * 40, 17, 17));
        }
      }
      for (let i = 0; i < 4; i++) {
        out.push(bone(`M${88 + i * 36} 300 q10 -6 20 0 v78 q-10 6 -20 0 z`));
      }
      out.push(ligament('M74 190 q-14 40 10 70', 7));
      out.push(ligament('M236 190 q14 40 -10 70', 7));
      out.push(romArc(154, 214, 128, 24, 84, '80° flexion'));
      out.push(label(360, 90, 'Radius', { to: [226, 90], anchor: 'end' }));
      out.push(label(20, 90, 'Ulna', { to: [86, 90], anchor: 'start' }));
      out.push(label(360, 240, 'Carpal bones', { to: [220, 236], anchor: 'end' }));
      out.push(label(20, 196, 'Articular disc', { to: [90, 200], anchor: 'start' }));
      return out.join('');
    },
  },

  'joint-hip': {
    category: 'joints', bodyPart: 'hip', title: 'Hip joint — ball and socket',
    viewBox: '0 0 420 420', width: 380, height: 380,
    render() {
      return [
        bone('M40 40 q150 -20 220 40 q30 46 -6 92 q-40 44 -110 30 q-84 -20 -104 -162 z'),
        cartilage('M164 120 q54 -22 76 26 q14 44 -30 60 q-48 10 -58 -32 q-8 -40 12 -54 z'),
        ell(214, 174, 50, 48),
        bone('M186 210 q28 26 56 4 l16 44 q-40 26 -84 -8 z'),
        bone('M240 244 q34 -6 40 22 l18 140 q-8 14 -40 14 q-32 0 -38 -14 z'),
        ligament('M170 132 q52 -26 80 8', 7),
        romArc(214, 174, 128, 20, 110, '120° flexion'),
        label(40, 300, 'Acetabulum', { to: [176, 150], anchor: 'start' }),
        label(400, 176, 'Femoral head', { to: [258, 174], anchor: 'end' }),
        label(400, 380, 'Femur', { to: [296, 360], anchor: 'end' }),
        label(60, 40, 'Ilium', { to: [130, 70], anchor: 'start' }),
      ].join('');
    },
  },

  'joint-knee': {
    category: 'joints', bodyPart: 'knee', title: 'Knee joint — hinge, lateral view',
    viewBox: '0 0 380 500', width: 320, height: 420,
    render() {
      const cx = 170;
      return [
        femurDistal(cx, 200),
        cartilage(`M${cx - 46} 224 q46 -16 92 0 q4 16 -12 20 h-68 q-16 -4 -12 -20 z`),
        ligamentBody(`M${cx - 44} 236 q22 -12 42 0 q-18 12 -42 0 z`),
        ligamentBody(`M${cx + 2} 236 q22 -12 42 0 q-18 12 -42 0 z`),
        tibiaProximal(cx, 248),
        fibulaProximal(cx, 248),
        ell(cx, 188, 26, 32),
        tendon(`M${cx - 16} 156 q16 -8 32 0 v28 q-16 8 -32 0 z`),
        tendon(`M${cx - 14} 218 q14 -6 28 0 l6 42 q-20 8 -40 0 z`),
        romArc(cx, 210, 138, 22, 130, '135° flexion'),
        label(350, 120, 'Femur', { to: [206, 116], anchor: 'end' }),
        label(350, 188, 'Patella', { to: [196, 188], anchor: 'end' }),
        label(350, 240, 'Meniscus', { to: [214, 238], anchor: 'end' }),
        label(20, 160, 'Quadriceps tendon', { to: [154, 162], anchor: 'start' }),
        label(20, 262, 'Patellar tendon', { to: [156, 250], anchor: 'start' }),
        label(350, 330, 'Tibia', { to: [200, 330], anchor: 'end' }),
      ].join('');
    },
  },

  'joint-ankle': {
    category: 'joints', bodyPart: 'ankle', title: 'Ankle joint — hinge, lateral view',
    viewBox: '0 0 400 420', width: 360, height: 378,
    render() {
      return [
        bone('M140 20 q34 0 38 20 v168 q-4 16 -38 16 q-34 0 -38 -16 v-168 q4 -20 38 -20 z'),
        bone('M196 30 q22 0 26 18 v158 q-4 16 -26 16 q-22 0 -26 -16 v-158 q4 -18 26 -18 z'),
        cartilage('M96 224 q66 -20 132 0 q4 16 -14 20 h-104 q-18 -4 -14 -20 z'),
        bone('M100 248 q64 -18 128 0 q8 40 -30 56 q-38 12 -70 -4 q-34 -18 -28 -52 z'),
        bone('M84 306 q90 -22 178 0 q10 34 -46 44 h-92 q-52 -12 -40 -44 z'),
        bone('M262 316 q52 -8 76 14 q6 24 -30 32 q-44 4 -58 -14 z'),
        ligament('M96 214 q-24 44 8 84', 7),
        ligament('M232 212 q24 44 -8 84', 7),
        romArc(164, 240, 122, 30, 100, '50° plantarflexion'),
        label(380, 100, 'Tibia', { to: [180, 100], anchor: 'end' }),
        label(20, 100, 'Fibula', { to: [112, 100], anchor: 'start' }),
        label(380, 236, 'Talus', { to: [200, 272], anchor: 'end' }),
        label(20, 330, 'Calcaneus', { to: [120, 328], anchor: 'start' }),
        label(380, 300, 'Lateral ligaments', { to: [244, 260], anchor: 'end' }),
      ].join('');
    },
  },
};

// ── PACK 5: LIGAMENTS ───────────────────────────────────────────────────────

/** Shared knee substrate so all five knee-ligament plates are identical
 *  underneath and only the highlighted structure differs. */
function kneeBase(cx = 170) {
  return femurDistal(cx, 200)
    + tibiaProximal(cx, 248)
    + fibulaProximal(cx, 248)
    + cartilage(`M${cx - 46} 224 q46 -16 92 0 q4 16 -12 20 h-68 q-16 -4 -12 -20 z`);
}

const kneeLig = (id, title, bodyPart, highlight, notes) => ({
  category: 'ligaments', bodyPart, title,
  viewBox: '0 0 380 500', width: 320, height: 420,
  render() { return kneeBase() + highlight() + notes(); },
});

export const ligaments = {
  'ligament-acl': kneeLig('acl', 'ACL — anterior cruciate ligament', 'acl',
    () => ligament('M196 216 q-30 26 -50 40', 11)
      + `<path d="M146 256 q30 -26 50 -40" fill="none" stroke="#fff" stroke-width="2" opacity="0.35"/>`,
    () => label(350, 250, 'ACL', { to: [172, 236], anchor: 'end' })
      + label(20, 300, 'Resists anterior tibial translation', { anchor: 'start', size: 12 })),

  'ligament-pcl': kneeLig('pcl', 'PCL — posterior cruciate ligament', 'pcl',
    () => ligament('M144 216 q30 26 50 40', 11),
    () => label(350, 250, 'PCL', { to: [176, 240], anchor: 'end' })
      + label(20, 300, 'Resists posterior tibial translation', { anchor: 'start', size: 12 })),

  'ligament-mcl': kneeLig('mcl', 'MCL — medial collateral ligament', 'mcl',
    () => ligament('M126 194 q-10 46 4 92', 11),
    () => label(20, 240, 'MCL', { to: [124, 240], anchor: 'start' })
      + label(20, 320, 'Resists valgus (inward) stress', { anchor: 'start', size: 12 })),

  'ligament-lcl': kneeLig('lcl', 'LCL — lateral collateral ligament', 'lcl',
    () => ligament('M216 194 q10 46 -4 92', 11),
    () => label(350, 240, 'LCL', { to: [216, 240], anchor: 'end' })
      + label(20, 320, 'Resists varus (outward) stress', { anchor: 'start', size: 12 })),

  'ligament-meniscus': kneeLig('meniscus', 'Menisci — medial and lateral', 'meniscus',
    () => ligamentBody('M124 236 q24 -14 46 0 q-20 14 -46 0 z')
      + ligamentBody('M170 236 q24 -14 46 0 q-20 14 -46 0 z')
      + tear(148, 236, 10),
    () => label(20, 232, 'Medial meniscus', { to: [138, 234], anchor: 'start' })
      + label(350, 232, 'Lateral meniscus', { to: [200, 234], anchor: 'end' })
      + label(20, 320, 'Wedge-shaped shock absorbers; tear marked', { anchor: 'start', size: 12 })),

  'ligament-rotator-cuff': {
    category: 'ligaments', bodyPart: 'rotator-cuff', title: 'Rotator cuff — four muscles',
    viewBox: '0 0 440 420', width: 390, height: 372,
    render() {
      return [
        bone('M60 70 q110 -14 156 10 l-12 106 q-6 34 -44 46 q-28 10 -48 -8 q-40 -40 -52 -154 z'),
        ell(300, 150, 50, 48),
        bone('M266 188 q34 26 68 0 l14 170 q-8 14 -48 14 q-40 0 -48 -14 z'),
        muscle('M104 76 q86 -12 130 12 q10 22 -18 30 q-70 -18 -108 -18 z'),
        tendon('M234 88 q40 6 62 26 q-8 18 -34 14 q-24 -14 -46 -18 z'),
        muscle('M96 126 q84 -8 124 14 q6 20 -22 24 q-62 -14 -96 -14 z'),
        tendon('M220 140 q42 4 64 22 q-8 16 -32 12 q-24 -12 -44 -16 z'),
        muscle('M104 180 q80 -6 116 16 q4 18 -22 20 q-56 -12 -88 -12 z'),
        muscle('M118 226 q72 -4 102 16 q2 16 -22 18 q-50 -10 -74 -10 z'),
        label(30, 60, 'Supraspinatus', { to: [150, 84], anchor: 'start' }),
        label(30, 130, 'Infraspinatus', { to: [150, 136], anchor: 'start' }),
        label(30, 196, 'Teres minor', { to: [156, 190], anchor: 'start' }),
        label(30, 262, 'Subscapularis', { to: [168, 238], anchor: 'start' }),
        label(420, 150, 'Humeral head', { to: [340, 150], anchor: 'end' }),
        label(420, 106, 'Cuff tendon insertion', { to: [292, 106], anchor: 'end' }),
      ].join('');
    },
  },
};

export function renderAll(collection) {
  return Object.entries(collection).map(([id, d]) => ({
    id,
    category: d.category,
    bodyPart: d.bodyPart,
    title: d.title,
    svg: svgDoc({
      viewBox: d.viewBox, width: d.width, height: d.height,
      title: d.title, body: d.render(),
    }),
  }));
}
