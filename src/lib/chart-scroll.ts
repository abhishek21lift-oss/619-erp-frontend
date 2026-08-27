/**
 * Scrolls a horizontal strip so the element marked `data-hour-index={index}`
 * sits centred, clamped so it never scrolls past either end.
 *
 * Extracted from insights/traffic so the arithmetic can be tested against a
 * real element with real geometry, rather than asserted by reading the page's
 * source. The clamping is the part worth testing: the busiest hour is often
 * 06:00 or 22:00, the two cases where centring wants a scrollLeft outside the
 * scrollable range.
 *
 * Writes scrollLeft directly rather than calling scrollIntoView, which also
 * scrolls ancestors and would jump the whole page vertically. Assigning
 * scrollLeft (rather than scrollTo with a behavior) is instant by definition,
 * so called from a layout effect the strip is already positioned at first
 * paint: nothing animates, nothing moves, and there is no layout shift to
 * measure.
 *
 * Returns whether it moved anything, which is what the tests assert on.
 */
export function scrollIndexIntoCentre(el: HTMLElement, index: number): boolean {
  const overflow = el.scrollWidth - el.clientWidth;
  // Wide enough to show everything — every desktop — so there is nothing to do.
  if (overflow <= 0) return false;

  const target = el.querySelector<HTMLElement>(`[data-hour-index="${index}"]`);
  if (!target) return false;

  const centred = target.offsetLeft + target.offsetWidth / 2 - el.clientWidth / 2;
  const next = Math.max(0, Math.min(centred, overflow));
  if (next === el.scrollLeft) return false;
  el.scrollLeft = next;
  return true;
}
