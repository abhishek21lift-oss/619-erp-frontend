// The colour system, and the guard that keeps it one system.
//
// The app used to carry 226 distinct hex values — indigo, violet, purple,
// cyan, magenta, teal, orange, lime, maroon, saffron, gold and five separate
// greys — with no rule behind any of it. Three different blues could appear
// in a single card, and the same amber meant "warning" in one place and "this
// tile is the fourth one" in another, so colour carried no information.
//
// It is now five families and 47 values. The last test in this file is the
// one that matters: it re-scans the whole of src/ and fails on any hex that
// is not in the palette, because a system like this does not decay by being
// rewritten, it decays one stray violet at a time. It scans this file too —
// which is why the prose here names no hex codes.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { palette, semantic, band, identity, series, founderGold, tint, rgba } from '@/lib/palette';

const FAMILIES = ['blue', 'emerald', 'amber', 'red', 'gray'] as const;

function allHexes(): string[] {
  return Object.values(palette).flatMap((scale) => Object.values(scale as Record<string, string>));
}

describe('the palette', () => {
  it('is exactly five families', () => {
    expect(Object.keys(palette).sort()).toEqual([...FAMILIES].sort());
  });

  it('is every value a real 6-digit hex, in upper case', () => {
    // Mixed case is how the same colour ends up looking like two colours in a
    // grep, which is how the old palette hid its own size.
    for (const hex of allHexes()) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('never repeats a value inside one family', () => {
    for (const f of FAMILIES) {
      const vals = Object.values(palette[f] as Record<string, string>);
      expect(new Set(vals).size).toBe(vals.length);
    }
  });

  it('gets darker as the tone number climbs', () => {
    // Relied on everywhere: 600 is the hover for a 500 fill, and text on a 50
    // tint has to be 600+ to clear AA. If the ramp is not monotonic, "one step
    // darker" silently stops meaning that.
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    for (const f of FAMILIES) {
      const tones = Object.keys(palette[f] as Record<string, string>)
        .map(Number)
        .filter((t) => t !== 950)   // blue-950 is the on-dark variant, not a step
        .sort((a, b) => a - b);
      for (let i = 1; i < tones.length; i++) {
        const prev = (palette[f] as Record<string, string>)[String(tones[i - 1])];
        const cur = (palette[f] as Record<string, string>)[String(tones[i])];
        expect(lum(cur)).toBeLessThan(lum(prev));
      }
    }
  });

  it('resolves every semantic name to a palette value', () => {
    const known = new Set(allHexes());
    for (const [name, value] of Object.entries(semantic)) {
      expect(known.has(value), `semantic.${name} = ${value} is not in the palette`).toBe(true);
    }
  });

  it('keeps the ordinal band five distinct steps', () => {
    // Excellent / Good / Average / Needs work / Poor. Two of these landing on
    // the same amber is exactly the bug this ramp exists to prevent.
    const vals = Object.values(band);
    expect(vals).toHaveLength(5);
    expect(new Set(vals).size).toBe(5);
  });

  it('keeps identity colours free of meaning', () => {
    // A client whose avatar came out red must not look overdue, so the
    // non-semantic ramp borrows nothing from emerald, amber or red.
    const meaningful = new Set([
      ...Object.values(palette.emerald),
      ...Object.values(palette.amber),
      ...Object.values(palette.red),
    ]);
    for (const c of identity) expect(meaningful.has(c)).toBe(false);
    expect(new Set(identity).size).toBe(identity.length);
  });

  it('keeps chart series distinct', () => {
    expect(new Set(series).size).toBe(series.length);
  });
});

describe('helpers', () => {
  it('appends an 8-bit alpha suffix', () => {
    expect(tint('#0067E0', 1)).toBe('#0067E0ff');
    expect(tint('#0067E0', 0)).toBe('#0067E000');
    expect(tint('#0067E0', 0.1)).toBe('#0067E01a');
  });

  it('clamps alpha rather than emitting nonsense', () => {
    expect(tint('#0067E0', 5)).toBe('#0067E0ff');
    expect(tint('#0067E0', -2)).toBe('#0067E000');
  });

  it('converts to rgba', () => {
    expect(rgba('#0067E0', 0.1)).toBe('rgba(0,103,224,0.1)');
  });
});

describe('the app uses only the palette', () => {
  it('has no hex colour outside the five families anywhere in src/', () => {
    // founderGold is the second deliberate non-semantic exception, after
    // `identity`. It is allowed through here and then confined to one file by
    // the assertion below — the scan alone would let it spread anywhere.
    //
    // The marketing page (components/landing) is the third: a self-contained
    // dark cinematic surface that deliberately paints outside the five
    // families, with its own token file. It is exempt here and confined to
    // that one file by the assertion below — same pattern as founderGold.
    //
    // The visualization system (components/visualizations) is the fourth,
    // same shape again: MY PT STUDIO's chart identity (saffron accent, navy
    // "premium" surface, a wider categorical series ramp than five semantic
    // families can carry) lives entirely in theme/colors.ts and is confined
    // there by the assertion below.
    //
    // The member app's spectrum is the fifth: decorative colour for the
    // member portal's hero and tiles, never for status, in
    // components/member/memberTheme.ts.
    //
    // The exercise library's region colours are the sixth, same shape again:
    // one hue per body region, decorative, in
    // components/pt-os/exercise-library/libraryTheme.ts.
    //
    // The dashboard's Today's Sessions card is the seventh: its mark, day
    // ring and row halos, in components/dashboards/todayTheme.ts.
    //
    // My Profile is the eighth: section tiles, tab pills and the hero mesh,
    // in components/profile/profileTheme.ts.
    const known = new Set(
      [...allHexes(), ...Object.values(founderGold)].map((h) => h.toUpperCase())
    );
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.(tsx?|css)$/.test(entry)) continue;
        // The palette module is where the canonical values are declared.
        if (p.endsWith(join('lib', 'palette.ts'))) continue;
        // The marketing page is its own system — confined below.
        if (p.includes(join('components', 'landing'))) continue;
        // The visualization system is its own system too — confined below.
        if (p.includes(join('components', 'visualizations'))) continue;
        // The member app's decorative spectrum — its one token file, confined below.
        if (p.endsWith(join('components', 'member', 'memberTheme.ts'))) continue;
        // The exercise library's region colours — its one token file, confined below.
        if (p.endsWith(join('exercise-library', 'libraryTheme.ts'))) continue;
        // The Today card's decorative colour — its one token file, confined below.
        if (p.endsWith(join('dashboards', 'todayTheme.ts'))) continue;
        // My Profile's decorative colour — its one token file, confined below.
        if (p.endsWith(join('components', 'profile', 'profileTheme.ts'))) continue;
        const text = readFileSync(p, 'utf8');
        for (const m of text.match(/#[0-9a-fA-F]{6}\b/g) ?? []) {
          if (!known.has(m.toUpperCase())) offenders.push(`${p}: ${m}`);
        }
      }
    };
    walk(join(process.cwd(), 'src'));

    // Named individually rather than counted: the failure message should say
    // which file reintroduced which colour.
    expect(offenders).toEqual([]);
  });

  it('confines founder gold to the badge that needs it', () => {
    // The five families mean something; gold does not, and must not start to.
    // Letting it through the scan above without this would make "five
    // semantic colours" true only of the token file.
    const users: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.(tsx?|css)$/.test(entry)) continue;
        if (p.endsWith(join('lib', 'palette.ts'))) continue;
        if (p.includes('__tests__')) continue;
        if (/founderGold/.test(readFileSync(p, 'utf8'))) users.push(p.split(join('src') + sep)[1].replaceAll(sep, '/'));
      }
    };
    walk(join(process.cwd(), 'src'));
    expect(users).toEqual(['components/FounderBadge.tsx']);
  });

  it('confines the member spectrum to the member portal', () => {
    // The fifth exception (components/member/memberTheme.ts): a decorative
    // spectrum for the member app's hero and tiles. Its hexes are exempt from
    // the scan above only in that file, so a stray one anywhere else already
    // fails there. This keeps the TOKENS in the portal too: the staff app
    // importing them would bring colour-without-meaning back to the surfaces
    // the five families exist for.
    const users: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.tsx?$/.test(entry)) continue;
        if (p.includes('__tests__')) continue;
        if (/member\/memberTheme|['"]\.\/memberTheme['"]/.test(readFileSync(p, 'utf8'))) {
          users.push(p.split(join('src') + sep)[1].replaceAll(sep, '/'));
        }
      }
    };
    walk(join(process.cwd(), 'src'));
    const outside = users.filter((u) => !u.startsWith('components/member/') && !u.startsWith('app/(bare)/member/'));
    expect(outside).toEqual([]);
  });

  it('confines the region colours to the exercise library', () => {
    // The sixth exception (exercise-library/libraryTheme.ts): one decorative
    // hue per body region. A muscle group is not a state, so it cannot borrow
    // a family that means one — but the same hues on a roster or a money
    // screen would be exactly the colour-without-meaning the five families
    // replaced. Only the library's own files may import them.
    const users: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.tsx?$/.test(entry)) continue;
        if (p.includes('__tests__')) continue;
        if (/libraryTheme['"]/.test(readFileSync(p, 'utf8'))) {
          users.push(p.split(join('src') + sep)[1].replaceAll(sep, '/'));
        }
      }
    };
    walk(join(process.cwd(), 'src'));
    const outside = users.filter((u) =>
      !u.startsWith('components/pt-os/exercise-library/') && !u.startsWith('app/(chrome)/pt-os/exercise-library/'));
    expect(users.length).toBeGreaterThan(0);
    expect(outside).toEqual([]);
  });

  it('confines the Today card colours to the dashboard', () => {
    // The seventh exception (dashboards/todayTheme.ts): decoration for the
    // Today's Sessions card. Only the dashboard may import it — the same hues
    // on a finance screen would be colour without meaning.
    const users: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.tsx?$/.test(entry)) continue;
        if (p.includes('__tests__')) continue;
        if (/todayTheme['"]/.test(readFileSync(p, 'utf8'))) {
          users.push(p.split(join('src') + sep)[1].replaceAll(sep, '/'));
        }
      }
    };
    walk(join(process.cwd(), 'src'));
    expect(users).toEqual(['components/dashboards/PtOsDashboard.tsx']);
  });

  it('confines the profile colours to My Profile and the client profile', () => {
    // The eighth exception (profile/profileTheme.ts): decoration for the
    // trainer's own profile page and its sections. Only those may import it.
    const users: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.tsx?$/.test(entry)) continue;
        if (p.includes('__tests__')) continue;
        if (/profileTheme['"]/.test(readFileSync(p, 'utf8'))) {
          users.push(p.split(join('src') + sep)[1].replaceAll(sep, '/'));
        }
      }
    };
    walk(join(process.cwd(), 'src'));
    // The trainer's client profile shares the same decoration, so the coach's
    // own page and the client pages they work on read as one family. State on
    // it (paid, due, overdue, document status) stays in the five families.
    const outside = users.filter((u) =>
      !u.startsWith('components/profile/')
      && u !== 'app/(chrome)/settings/profile/page.tsx'
      && u !== 'app/(chrome)/pt-os/clients/[id]/page.tsx');
    expect(users.length).toBeGreaterThan(0);
    expect(outside).toEqual([]);
  });

  it('confines the marketing surface to its own token file', () => {
    // The landing page may paint outside the five families (it runs its own
    // dark canvas), but only through landing/tokens.ts. A stray hex in a
    // landing component is the same decay the global scan guards against
    // everywhere else — it would mean the token system stopped being the
    // single source of the marketing look.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.tsx?$/.test(entry)) continue;
        if (p.endsWith(join('tokens.ts'))) continue;
        const text = readFileSync(p, 'utf8');
        for (const m of text.match(/#[0-9a-fA-F]{6}\b/g) ?? []) {
          offenders.push(`${p}: ${m}`);
        }
      }
    };
    walk(join(process.cwd(), 'src', 'components', 'landing'));
    expect(offenders).toEqual([]);
  });

  it('confines the visualization surface to its own token file', () => {
    // Same rule as the marketing page, same reason: MY PT STUDIO's chart
    // identity (saffron, navy, the wider series ramp) lives once, in
    // visualizations/theme/colors.ts. Every other file in the folder must
    // reach it through that module (or through a var(--token, #fallback)
    // whose fallback is itself a sanctioned five-family value — that's not a
    // new colour, it's the existing one spelled defensively) rather than
    // hand-writing a new hex, or the seven chart components stop being one
    // system the moment a second file starts inventing its own colours.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.tsx?$/.test(entry)) continue;
        if (p.endsWith(join('theme', 'colors.ts'))) continue;
        const text = readFileSync(p, 'utf8');
        const known = new Set(allHexes().map((h) => h.toUpperCase()));
        for (const m of text.match(/#[0-9a-fA-F]{6}\b/g) ?? []) {
          if (!known.has(m.toUpperCase())) offenders.push(`${p}: ${m}`);
        }
      }
    };
    walk(join(process.cwd(), 'src', 'components', 'visualizations'));
    expect(offenders).toEqual([]);
  });
});
