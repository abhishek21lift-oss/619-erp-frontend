import { linearGradientDef } from '@nivo/core';

/**
 * One gradient recipe, shared by every chart that fills a shape with colour
 * (bars, areas, donut/pie slices, radial-bar tracks) — this is what "subtle
 * gradients" means across the system: the same top-to-bottom fade at the
 * same two opacity stops everywhere, keyed off each series' own colour
 * rather than a hardcoded hue, so a chart's gradient always matches its flat
 * fallback colour.
 */
export function buildGradientFill(
  items: readonly { id: string | number; color: string }[],
  opts: { fromOpacity?: number; toOpacity?: number } = {},
): {
  defs: ReturnType<typeof linearGradientDef>[];
  fill: { id: string; match: { id: string | number } }[];
} {
  const { fromOpacity = 0.95, toOpacity = 0.55 } = opts;
  const defs = items.map((item, i) =>
    linearGradientDef(`vizGradient${i}`, [
      { offset: 0, color: item.color, opacity: fromOpacity },
      { offset: 100, color: item.color, opacity: toOpacity },
    ]),
  );
  const fill = items.map((item, i) => ({ id: `vizGradient${i}`, match: { id: item.id } }));
  return { defs, fill };
}
