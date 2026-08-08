// Attendance records → a ranked check-in board.
//
// Separate from the page because a Next route file may only export the route's
// own entry points, and because the tie rule below is the kind of thing that
// looks right in a screenshot with four distinct counts and is wrong the first
// week two members finish level.

import type { Attendance } from '@/lib/api';

export type BoardRow = {
  id: string;
  name: string;
  photo: string | null;
  checkins: number;
  /** Joint rank — two members on the same count share a place. */
  rank: number;
};

export function buildBoard(
  records: Attendance[],
  photos: Map<string, string | null> = new Map(),
): BoardRow[] {
  const map = new Map<string, { name: string; checkins: number }>();
  for (const r of records) {
    // Only a body through the door counts. 'absent' and 'excused' rows exist
    // for the same member on the same day and would otherwise inflate them.
    if (r.status !== 'present' && r.status !== 'late') continue;
    const id = String(r.ref_id || '');
    if (!id) continue;
    const row = map.get(id) || { name: r.ref_name || 'Member', checkins: 0 };
    row.checkins++;
    map.set(id, row);
  }

  const sorted = Array.from(map.entries())
    .map(([id, v]) => ({ id, ...v }))
    // Name as the tiebreak, so the order of two level members is stable across
    // reloads rather than following whatever order the rows arrived in.
    .sort((a, b) => b.checkins - a.checkins || a.name.localeCompare(b.name));

  let rank = 0;
  let prev: number | null = null;
  return sorted.map((r, i) => {
    // Level counts share a place, and the next distinct count skips the places
    // they used up: 5, 5, 3 is 1st, 1st, 3rd. Numbering them 1, 2, 3 tells one
    // of two identical members they came second.
    if (r.checkins !== prev) { rank = i + 1; prev = r.checkins; }
    return { ...r, photo: photos.get(r.id) ?? null, rank };
  });
}
