/**
 * Chart shape — every border-radius, border-width and box-shadow a Premium*
 * component or primitive draws. Split into three small groups (radius,
 * border, shadow) rather than one flat bag, so "make every corner rounder"
 * or "make the tooltip's shadow heavier" is an edit to one named value here,
 * never a literal typed inline in a component.
 */

/**
 * Card-level radii alias the app's own --radius-* custom properties, so a
 * chart card is dimensionally identical to every other card around it and a
 * global radius change still reaches every chart with zero edits here.
 * Mark-level radii (a bar's corner, a tooltip's corner, a point's border)
 * are this system's own — a chart mark is drawn in SVG, not CSS, so there is
 * no shared app token for it to alias.
 */
export const radius = {
  /** ChartShell's own card frame. */
  card: 'var(--radius-md, 16px)',
  cardSm: 'var(--radius-sm, 10px)',
  pill: 'var(--radius-full, 9999px)',
  /** ChartShell's icon chip. */
  chip: 10,
  /** A bar's top corners (PremiumBarChart). */
  bar: 5,
  /** A donut/pie slice's corner (PieBase). */
  pieCorner: 3,
  /** A progress ring's end-cap — fully round. */
  progressCap: 999,
  /** ChartTooltipCard. */
  tooltip: 12,
  /** The colour dot beside a tooltip row — a circle. */
  tooltipDot: 999,
  /** The colour swatch beside a legend label — a rounded square, not a dot. */
  legendSwatch: 3,
} as const;

export const border = {
  default: 'var(--border, rgba(15,23,42,0.08))',
  width: 1,
  /** Stroke width of a line/area chart's line. */
  lineWidth: 2.5,
  /** Stroke width of a sparkline's line — thinner, the chart itself is tiny. */
  sparklineWidth: 2,
  /** Border width of a line/area point marker. */
  pointWidth: 2.5,
  /** Border width of a donut/pie slice's separator. */
  pieSliceWidth: 2,
} as const;

export const shadow = {
  card: 'var(--shadow-card, 0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05))',
  cardDark: '0 20px 48px -20px rgba(0,0,0,0.55)',
  tooltip: '0 16px 40px -12px rgba(15,23,42,0.22)',
  tooltipDark: '0 16px 40px -12px rgba(0,0,0,0.6)',
  /** The hairline ring around a tooltip's colour dot, so it reads on either surface. */
  dotRing: '0 0 0 2px rgba(15,23,42,0.03)',
  dotRingDark: '0 0 0 2px rgba(255,255,255,0.06)',
} as const;

export const shape = { radius, border, shadow } as const;
