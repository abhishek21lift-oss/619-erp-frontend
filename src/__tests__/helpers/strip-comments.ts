/**
 * Source with its comments blanked out, line numbers and offsets intact.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * Guards in this suite read source and assert that some string is present or
 * absent. Six of them have now been tripped by a COMMENT rather than by code
 * — and every time, by a comment explaining the very thing the guard checks:
 *
 *   · a component whose comment said why it does not suppress the focus ring
 *     was flagged for suppressing the focus ring
 *   · a card whose comment said the "Locked" chip had been removed was
 *     flagged for still having a "Locked" chip
 *   · three route guards, and one convention test, in the same shape
 *
 * It is a self-defeating pattern: the better the explanation of a removal,
 * the more likely the guard is to fail on it. And it fails in the direction
 * that costs the most — a false positive on a change that was correct.
 *
 * A comment cannot render, cannot style and cannot call an endpoint, so
 * nothing is lost by not reading them. Blanking rather than deleting keeps
 * every offset where it was, so a guard that reports a line number still
 * reports the right one, and a guard that slices by index still slices in the
 * same place.
 *
 * ── What it does not handle ───────────────────────────────────────────────
 *
 * A `//` or a comment opener inside a string or a regex literal is treated as
 * a comment. That is the wrong answer in principle and the right one here:
 * these guards match on source text, and the alternative is a real JS parser
 * for a job that is checking whether a word appears. `https://` is the one
 * common case it would ruin, so protocol-relative slashes are left alone.
 */
export function stripComments(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  return src
    // Block comments first: a `//` inside one is not a second comment.
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    // Line comments, but not the `//` in a URL — which is always preceded by
    // a colon, and never by whitespace or a line start.
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead: string) => lead + blank(m.slice(lead.length)));
}
