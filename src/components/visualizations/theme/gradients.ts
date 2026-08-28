import { linearGradientDef } from '@nivo/core';

/**
 * The three gradient recipes this system uses — this IS what "subtle
 * gradients" means as a token: a fixed pair of opacity stops per fill type,
 * not a number chosen per call site. A bar and a donut both fill solid
 * (barely fading, `fill`); a line/area's fill fades hard toward transparent
 * (`area`); a sparkline's fill fades hardest of all (`sparkline`), because at
 * 32px tall a strong fill reads as a block, not a trend.
 */
export const gradientPreset = {
  fill: { fromOpacity: 0.95, toOpacity: 0.55 },
  area: { fromOpacity: 0.32, toOpacity: 0.02 },
  sparkline: { fromOpacity: 0.28, toOpacity: 0.02 },
  /** No fill at all — used where a chart's `enableArea` is off. */
  none: { fromOpacity: 0, toOpacity: 0 },
} as const;

export type GradientPreset = { fromOpacity: number; toOpacity: number };

/**
 * One gradient recipe, shared by every chart that fills a shape with colour
 * (bars, areas, donut/pie slices) — the same top-to-bottom fade at whichever
 * preset's opacity stops, keyed off each series' own colour rather than a
 * hardcoded hue, so a chart's gradient always matches its flat fallback
 * colour.
 */
export function buildGradientFill(
  items: readonly { id: string | number; color: string }[],
  preset: GradientPreset = gradientPreset.fill,
): {
  defs: ReturnType<typeof linearGradientDef>[];
  fill: { id: string; match: { id: string | number } }[];
} {
  const { fromOpacity, toOpacity } = preset;
  const defs = items.map((item, i) =>
    linearGradientDef(`vizGradient${i}`, [
      { offset: 0, color: item.color, opacity: fromOpacity },
      { offset: 100, color: item.color, opacity: toOpacity },
    ]),
  );
  const fill = items.map((item, i) => ({ id: `vizGradient${i}`, match: { id: item.id } }));
  return { defs, fill };
}
