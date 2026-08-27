/**
 * The one row-shape every Premium* component that isn't a pie takes:
 * `{ data: rows[], xKey, series: [{key, label, color}] }` — matching the API
 * the app's existing recharts wrappers already used, so migrating a page
 * later is a component swap, not a data-reshaping exercise.
 *
 * toNivoSeries turns that into the `{id, data:[{x,y}]}[]` shape @nivo/line
 * wants. Shared by PremiumLineChart, PremiumAreaChart and PremiumSparkline
 * so the reshape logic exists exactly once.
 */
export interface PremiumSeriesSpec {
  /** Field in each data row this series reads. */
  key: string;
  /** Series name — shown in the tooltip and legend. */
  label: string;
  color?: string;
}

export function toNivoSeries(
  data: readonly Record<string, unknown>[],
  xKey: string,
  seriesSpecs: readonly PremiumSeriesSpec[],
): { id: string; data: { x: string | number; y: number | null }[] }[] {
  return seriesSpecs.map((s) => ({
    id: s.key,
    data: data.map((row) => {
      const raw = row[s.key];
      const y = raw == null || raw === '' ? null : Number(raw);
      return { x: String(row[xKey] ?? ''), y: Number.isFinite(y) ? y : null };
    }),
  }));
}
