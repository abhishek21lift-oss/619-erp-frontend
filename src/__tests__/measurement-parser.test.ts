/**
 * The assessment family's string → number boundary.
 *
 * Fitness testing, goal, mobility, lifestyle and nutrition each carried their
 * own copy of a `parseFloat`-based parser. `parseFloat` reads a PREFIX and
 * stops, so a mistyped measurement became a DIFFERENT, plausible measurement
 * rather than being refused — and these values are not merely stored. BMI, the
 * Rockport VO2 max estimate and the 1RM formulas all compute from them and
 * store a score, so nothing downstream can tell that a digit was dropped.
 *
 * All five now delegate to one parser. These tests hold both halves: the
 * numbers it must read, and the shapes it must refuse.
 */

import { describe, it, expect } from 'vitest';
import { toMeasurementOrNull } from '@/lib/forms/normalize';
import { n as fitness } from '@/components/pt-os/fitness-testing/types';
import { n as goal } from '@/components/pt-os/goal-assessment/types';
import { n as mobility } from '@/components/pt-os/mobility-assessment/types';
import { n as lifestyle } from '@/components/pt-os/lifestyle-assessment/types';
import { n as nutrition } from '@/components/pt-os/nutrition-assessment/types';

const parsers: Array<[string, (v: string) => number | null]> = [
  ['fitness-testing', fitness],
  ['goal-assessment', goal],
  ['mobility-assessment', mobility],
  ['lifestyle-assessment', lifestyle],
  ['nutrition-assessment', nutrition],
];

describe('every assessment family shares one parser', () => {
  it.each(parsers)('%s exports the canonical one', (_name, parse) => {
    expect(parse).toBe(toMeasurementOrNull);
  });
});

describe('toMeasurementOrNull — what it reads', () => {
  it('reads a whole number', () => {
    expect(toMeasurementOrNull('72')).toBe(72);
    expect(toMeasurementOrNull('120')).toBe(120);
  });

  it('reads a decimal, which half the measurements are', () => {
    // A 12-minute run test finishes at 12.5; a skinfold is 8.4mm.
    expect(toMeasurementOrNull('12.5')).toBe(12.5);
    expect(toMeasurementOrNull('8.4')).toBe(8.4);
    expect(toMeasurementOrNull('.5')).toBe(0.5);
  });

  it('reads a negative, which a flexibility range can be', () => {
    // Sit-and-reach is measured from the toes: short of them is negative.
    expect(toMeasurementOrNull('-4')).toBe(-4);
    expect(toMeasurementOrNull('-2.5')).toBe(-2.5);
  });

  it('reads zero as zero, not as absent', () => {
    // Zero reps on an endurance test is a result. It is not a blank field.
    expect(toMeasurementOrNull('0')).toBe(0);
    expect(toMeasurementOrNull('0.0')).toBe(0);
  });

  it('tolerates the noise a paste brings with it', () => {
    // Deliberate, and the same rule every money field on the platform follows:
    // separators and interior spaces are formatting a person pasted in, not
    // content. '1,500' and '1 500' are both fifteen hundred. This is the one
    // place the parser is LOOSER than a bare Number(), and it is loose in a
    // direction that cannot invent a different magnitude — unlike parseFloat,
    // which drops everything after the noise and keeps the prefix.
    expect(toMeasurementOrNull(' 72 ')).toBe(72);
    expect(toMeasurementOrNull('1,500')).toBe(1500);
    expect(toMeasurementOrNull('7 0')).toBe(70);
  });
});

describe('toMeasurementOrNull — what it refuses', () => {
  it('is null for absent, never zero', () => {
    // `Number('')` is 0. A resting heart rate of zero is not an empty field,
    // and a BMI computed from a weight of 0 is a number the chart will draw.
    expect(toMeasurementOrNull('')).toBeNull();
    expect(toMeasurementOrNull('   ')).toBeNull();
    expect(toMeasurementOrNull('\t\n')).toBeNull();
  });

  it('refuses a prefix rather than reading it — the whole bug', () => {
    for (const bad of ['12abc', '70kg', '5ft', '12.5.3', 'abc', '--4', '1/2']) {
      expect(toMeasurementOrNull(bad), `${bad} must not become a number`).toBeNull();
    }
  });

  it('refuses the values that serialize to a silent null', () => {
    // NaN and Infinity both become JSON `null`, which arrives at the server
    // looking exactly like a field nobody filled in.
    for (const bad of ['NaN', 'Infinity', '-Infinity', '1e999']) {
      expect(toMeasurementOrNull(bad)).toBeNull();
    }
  });

  it('refuses shapes Number() would coerce through a non-numeric route', () => {
    expect(toMeasurementOrNull('0x10')).toBeNull();
    expect(toMeasurementOrNull('0b101')).toBeNull();
    expect(toMeasurementOrNull('true')).toBeNull();
    expect(toMeasurementOrNull('null')).toBeNull();
  });
});

describe('the specific numbers that used to come out wrong', () => {
  // Each of these returned a plausible, wrong measurement under parseFloat.
  const wasWrong: Array<[string, number]> = [
    ['12abc', 12],
    ['5ft 9', 5],
    ['70kg', 70],
    ['12.5.3', 12.5],
  ];

  it.each(wasWrong)('%j no longer reads as %d', (input, oldResult) => {
    expect(parseFloat(input), 'the old behaviour, for the record').toBe(oldResult);
    expect(toMeasurementOrNull(input), 'the new behaviour').toBeNull();
  });
});
