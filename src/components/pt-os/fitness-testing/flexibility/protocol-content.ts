// The K11 flexibility battery's instructions, one entry per test.
//
// Content, not code: the trainer reads these beside the fields so a test is
// performed the same way every time. The reference wording (the 15-inch
// zero point on the YMCA box, the 70–80° hamstrings band) is the supplied K11
// protocol's — it is not a universal clinical norm, and the UI says so.

import type { FlexibilityTestKey } from '@/lib/flexibility-protocol';

export interface TestProtocol {
  key: FlexibilityTestKey;
  /** Card and screen title. */
  name: string;
  /** The card's one-liner: what the test is for. */
  purpose: string;
  /** The card's setup line — what the client has to be doing. */
  setup: string;
  equipment: string[];
  positioning: string[];
  procedure: string[];
  measurement: string[];
  safety: string[];
  /** The protocol's own reference wording, where it has one. */
  reference?: string;
}

export const QUADRICEPS_PROTOCOL: TestProtocol = {
  key: 'quadriceps',
  name: 'Quadriceps',
  purpose: 'Quadriceps and rectus femoris length — how far the heel reaches the buttock with the pelvis held still.',
  setup: 'Prone on a firm table, hips flat, knees at or over the end of the table.',
  equipment: ['Firm treatment table', 'Tape measure or ruler, in cm'],
  positioning: [
    'Client lies prone, legs together, arms relaxed beside the body.',
    'Hips and pelvis flat on the table. Knees may overhang the end of the table; they must not rest on the floor.',
    'No pillow under the hips — a pillow lets the pelvis tilt and hides the result.',
  ],
  procedure: [
    'Ask the client to bend one knee slowly, bringing the heel towards the buttock.',
    'Stop at the first limit: hip lifting, pelvis rotating, or pain.',
    'Watch the pelvis throughout. Any lift or rotation is pelvic compensation — answer Yes.',
    'Record whether the heel touched the buttock.',
    'If it did not touch, measure the distance from heel to buttock in cm.',
    'Ask whether the movement caused pain.',
    'Repeat on the other side.',
  ],
  measurement: [
    'Contact = the heel reached the buttock. Distance is only measured when it did not.',
    'The distance is the shortest gap between heel and buttock, to the nearest 0.5 cm.',
    'Contact with the heel is a normal result; a contact of No with a large distance is what flags tightness.',
  ],
  safety: [
    'Never push the heel down. Knee joint compression in this position is the risk, not the stretch.',
    'Stop on sharp knee or hip pain, cramp or locking.',
  ],
};

export const HAMSTRINGS_PROTOCOL: TestProtocol = {
  key: 'hamstrings',
  name: 'Hamstrings 70° Reach',
  purpose: 'Hamstring length, read as the hip flexion angle reached with the knee fully straight.',
  setup: 'Supine, opposite leg flat, test leg straight and lifted by the trainer.',
  equipment: ['Treatment table', 'Goniometer or inclinometer app'],
  positioning: [
    'Client lies supine, arms by the sides, both legs flat to start.',
    'The non-test leg stays flat on the table for the whole measurement.',
  ],
  procedure: [
    'Lift one straight leg, keeping the knee fully extended.',
    'Stop at the first firm resistance, when the pelvis starts to tilt, or when the client reports pain.',
    'Read the hip flexion angle between the table line and the thigh.',
    'Record whether the knee stayed fully extended. A bent knee invalidates the angle — repeat.',
    'Watch the pelvis and the opposite leg. Lift or tilt is pelvic compensation — repeat.',
    'Ask whether the stretch became pain.',
    'Repeat on the other side.',
  ],
  measurement: [
    'Angle in whole degrees, 0–180, from the table line to the thigh axis.',
    'Knee extended must be Yes for the angle to count.',
    'Pelvic compensation must be No for the angle to count.',
  ],
  safety: [
    'A straight-leg raise loads the lower back. Stop if the client reports back pain or neural symptoms down the leg.',
    'Never force past the first firm resistance.',
  ],
  reference: 'Reference range from the supplied K11 protocol: 70–80°. Below 70° flags a further flexibility assessment; above 80° is above the reference range, not abnormal.',
};

export const HIP_FLEXORS_PROTOCOL: TestProtocol = {
  key: 'hip_flexors',
  name: 'Hip Flexors — Thomas',
  purpose: 'Iliopsoas and rectus femoris length, read from where the relaxed thigh sits against the table line.',
  setup: 'Supine at the end of the table, sacrum supported, non-test knee held to the chest.',
  equipment: ['Treatment table with an open end', 'Goniometer or inclinometer app'],
  positioning: [
    'Client sits at the end of the table, then lies back with the sacrum on the table top.',
    'The non-test knee is held to the chest, hands around the shin.',
    'The test leg hangs relaxed off the end. The trainer does not hold it.',
  ],
  procedure: [
    'Let the test leg settle completely — no bracing, no lifting.',
    'Compare the test thigh with the horizontal line of the table: below the line, level with it (at), or above it.',
    'Read the knee flexion angle when the thigh sits above the table line.',
    'Watch the lumbar spine and pelvis. Flattening the back or tucking the pelvis to let the leg drop is pelvic compensation — answer Yes.',
    'Ask whether the position caused pain.',
    'Repeat on the other side.',
  ],
  measurement: [
    'Thigh position is judged against the table line, not against an estimate of hip extension range.',
    'Knee flexion is recorded in degrees when measured; leave it blank when the thigh is below or level with the line.',
    'Thigh position alone never diagnoses — a result above the line is recorded as a possible restriction, not a finding.',
  ],
  safety: [
    'Stop if the client reports anterior hip pinching or low-back pain.',
    'Support the sacrum — sliding off the table end during the test invalidates it.',
  ],
};

export const SIT_AND_REACH_PROTOCOL: TestProtocol = {
  key: 'sit_and_reach',
  name: 'YMCA Sit and Reach',
  purpose: 'Posterior-chain flexibility, read from the reach on the YMCA box, scored against its 15-inch zero point.',
  setup: 'Seated, shoes off, soles against the box, knees straight, hands stacked over the scale.',
  equipment: ['YMCA sit-and-reach box', 'Or a bench with a tape fixed so the 15-inch mark is the zero point'],
  positioning: [
    'Client sits with the soles of the feet flat against the box.',
    'Knees straight and flat on the floor, feet shoulder-width apart.',
    'Hands stacked, palms down, fingertips on the scale.',
  ],
  procedure: [
    'Ask the client to exhale and reach forward slowly along the scale.',
    'Hold the furthest point for two seconds; the trainer reads the scale at the fingertips (to the nearest 0.5 inch).',
    'Two attempts is the protocol count; a third is allowed when the first two disagree.',
    'Mark an attempt invalid when the knees bent or the body bounced — the trainer judges this per attempt.',
    'The best valid attempt is the one scored.',
  ],
  measurement: [
    'The 15-inch mark is the box zero point: a reach level with it scores 0.',
    'Score = best reach − 15. Reaching short of the zero point is a real negative score.',
    'Invalid attempts never win, however far they reached.',
  ],
  safety: [
    'No bouncing or ballistic reaching — it loads the spine and inflates the score.',
    'Stop on low-back pain or hamstring cramp.',
  ],
  reference: 'Sit-and-reach norms are age- and sex-specific and need a validated reference table. None is loaded, so the score is displayed raw with no category.',
};

export const FLEXIBILITY_PROTOCOLS: Record<FlexibilityTestKey, TestProtocol> = {
  quadriceps: QUADRICEPS_PROTOCOL,
  hamstrings: HAMSTRINGS_PROTOCOL,
  hip_flexors: HIP_FLEXORS_PROTOCOL,
  sit_and_reach: SIT_AND_REACH_PROTOCOL,
};

export const FLEXIBILITY_TEST_ORDER: FlexibilityTestKey[] = ['quadriceps', 'hamstrings', 'hip_flexors', 'sit_and_reach'];
