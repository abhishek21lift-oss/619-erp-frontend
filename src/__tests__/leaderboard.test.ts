// Ranking the check-in board.
//
// The old page did `sort((a,b) => b.checkins - a.checkins)` and then printed
// the array index. That is correct for the four members with four distinct
// counts that were on screen the day it was written, and wrong the first week
// two of them finish level — one of two identical members is told they came
// second, in a studio where the board is on a wall.
//
// None of this fails loudly. A miscounted board looks exactly like a board.

import { describe, expect, it } from 'vitest';
import { buildBoard } from '@/lib/leaderboard';
import type { Attendance } from '@/lib/api';

const visit = (ref_id: string, ref_name: string, status = 'present'): Attendance =>
  ({ ref_id, ref_name, status }) as Attendance;

const repeat = (n: number, id: string, name: string, status = 'present') =>
  Array.from({ length: n }, () => visit(id, name, status));

describe('what counts as a check-in', () => {
  it('counts present', () => {
    expect(buildBoard([visit('a', 'Ajeet')])[0].checkins).toBe(1);
  });

  it('counts late — they turned up', () => {
    expect(buildBoard([visit('a', 'Ajeet', 'late')])[0].checkins).toBe(1);
  });

  it('ignores absent and excused rather than counting the row', () => {
    // These exist for the same member on the same day. Counting them would
    // put the member who never comes at the top of the board.
    expect(buildBoard([visit('a', 'Ajeet', 'absent'), visit('a', 'Ajeet', 'excused')])).toEqual([]);
  });

  it('drops a record with no member attached', () => {
    expect(buildBoard([visit('', 'Ghost')])).toEqual([]);
  });

  it('falls back to a placeholder when the name is missing, rather than dropping the visits', () => {
    const board = buildBoard([{ ref_id: 'a', status: 'present' } as Attendance]);
    expect(board).toHaveLength(1);
    expect(board[0].name).toBe('Member');
  });
});

describe('order', () => {
  it('puts the most check-ins first', () => {
    const board = buildBoard([
      ...repeat(1, 'b', 'Bhavna'),
      ...repeat(4, 'a', 'Ajeet'),
      ...repeat(2, 'c', 'Chetan'),
    ]);
    expect(board.map((r) => r.name)).toEqual(['Ajeet', 'Chetan', 'Bhavna']);
  });

  it('breaks a tie by name, so the order does not shuffle between reloads', () => {
    // Without this the order follows whatever order the attendance rows came
    // back in, and the board reorders itself under the reader on a refresh
    // that changed nothing.
    const a = buildBoard([...repeat(2, 'z', 'Zoya'), ...repeat(2, 'a', 'Ankit')]);
    const b = buildBoard([...repeat(2, 'a', 'Ankit'), ...repeat(2, 'z', 'Zoya')]);
    expect(a.map((r) => r.name)).toEqual(['Ankit', 'Zoya']);
    expect(b.map((r) => r.name)).toEqual(['Ankit', 'Zoya']);
  });
});

describe('rank', () => {
  it('numbers a board with no ties 1, 2, 3', () => {
    const board = buildBoard([...repeat(3, 'a', 'A'), ...repeat(2, 'b', 'B'), ...repeat(1, 'c', 'C')]);
    expect(board.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('gives level members the same place', () => {
    const board = buildBoard([...repeat(5, 'a', 'A'), ...repeat(5, 'b', 'B')]);
    expect(board.map((r) => r.rank)).toEqual([1, 1]);
  });

  it('skips the places a tie used up', () => {
    // 5, 5, 3 is 1st, 1st, 3rd. Numbering it 1, 1, 2 invents a second place
    // that nobody holds.
    const board = buildBoard([...repeat(5, 'a', 'A'), ...repeat(5, 'b', 'B'), ...repeat(3, 'c', 'C')]);
    expect(board.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it('handles a tie that is not at the top', () => {
    const board = buildBoard([
      ...repeat(9, 'a', 'A'), ...repeat(4, 'b', 'B'), ...repeat(4, 'c', 'C'), ...repeat(1, 'd', 'D'),
    ]);
    expect(board.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it('gives everyone first place when the whole board is level', () => {
    const board = buildBoard([...repeat(2, 'a', 'A'), ...repeat(2, 'b', 'B'), ...repeat(2, 'c', 'C')]);
    expect(board.map((r) => r.rank)).toEqual([1, 1, 1]);
  });
});

describe('photos', () => {
  it('attaches the member\'s photo when there is one', () => {
    const board = buildBoard([visit('a', 'Ajeet')], new Map([['a', '/p/a.jpg']]));
    expect(board[0].photo).toBe('/p/a.jpg');
  });

  it('leaves the row renderable when the photo lookup has nothing', () => {
    // The photo fetch is a second request that is allowed to fail — the board
    // must not depend on it. null is the value ClientAvatar falls back on.
    expect(buildBoard([visit('a', 'Ajeet')])[0].photo).toBeNull();
    expect(buildBoard([visit('a', 'Ajeet')], new Map([['a', null]]))[0].photo).toBeNull();
  });
});

describe('an empty range', () => {
  it('is an empty board, not a board of zeroes', () => {
    expect(buildBoard([])).toEqual([]);
  });
});
