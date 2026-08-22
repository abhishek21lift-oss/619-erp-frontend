// The comment stripper the source-reading guards share.
//
// Six guards in this suite have been tripped by a comment rather than by
// code, every one of them by a comment explaining the thing the guard checks
// — so the better the explanation of a removal, the more likely the guard was
// to fail on it. This is the shared fix, and it has two properties that both
// matter and neither of which is obvious from reading it.
import { describe, expect, it } from 'vitest';
import { stripComments } from '@/__tests__/helpers/strip-comments';

describe('what it removes', () => {
  it('blanks a line comment', () => {
    expect(stripComments("const a = 1; // outline: 'none'")).not.toContain('outline');
  });

  it('blanks a block comment, however many lines it runs to', () => {
    const src = "const a = 1;\n/*\n * Locked\n * chip\n */\nconst b = 2;";
    const out = stripComments(src);
    expect(out).not.toContain('Locked');
    expect(out).toContain('const a = 1;');
    expect(out).toContain('const b = 2;');
  });

  it('does not treat a // inside a block comment as a second comment', () => {
    const src = "/* // */ const kept = 1;";
    expect(stripComments(src)).toContain('const kept = 1;');
  });

  it('leaves a URL alone', () => {
    // https:// is the one everyday string that looks exactly like a comment.
    const src = "const u = 'https://example.com/x'; const after = 1;";
    const out = stripComments(src);
    expect(out).toContain('https://example.com/x');
    expect(out).toContain('const after = 1;');
  });
});

describe('what it must not disturb', () => {
  it('keeps every line where it was', () => {
    // A guard that reports "file.tsx:64" reads the line number off the
    // stripped source. Deleting comments instead of blanking them shifts
    // every line after the first comment, so the offender list points at
    // innocent code — and it points at it convincingly.
    const src = [
      'const a = 1;',
      '// a comment',
      '/* a block',
      '   over lines */',
      'const offender = 2;',
    ].join('\n');

    const out = stripComments(src);
    expect(out.split('\n')).toHaveLength(src.split('\n').length);
    expect(out.split('\n')[4]).toContain('const offender = 2;');
  });

  it('keeps every offset where it was', () => {
    // The other consumer slices by indexOf. A shorter string moves the cut.
    const src = "/* comment */const marker = 1;";
    const out = stripComments(src);
    expect(out).toHaveLength(src.length);
    expect(out.indexOf('const marker')).toBe(src.indexOf('const marker'));
  });

  it('leaves code with no comments completely untouched', () => {
    const src = "const a = 1;\nconst b = 2;\n";
    expect(stripComments(src)).toBe(src);
  });
});
