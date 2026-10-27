// The nine path-based decorative surfaces the palette scan sanctions, each
// confined to its own token file by palette.test.ts. The tenth exemption,
// founderGold, lives in lib/palette.ts, which both scans skip separately.
// Paths are relative to src/, with forward slashes. Both scans import this
// list so they cannot drift apart.

export const DECORATIVE_THEME_PATHS = [
  'components/landing/',
  'components/visualizations/',
  'components/member/memberTheme.ts',
  'components/pt-os/exercise-library/libraryTheme.ts',
  'components/dashboards/todayTheme.ts',
  'components/profile/profileTheme.ts',
  'components/attendance/attendanceTheme.ts',
  'components/platform/ccTheme.ts',
  'components/pt-os/fitness-testing/fitnessTheme.ts',
] as const;

export function isDecorativeTheme(relPath: string): boolean {
  const p = relPath.replaceAll('\\', '/');
  return DECORATIVE_THEME_PATHS.some((entry) =>
    entry.endsWith('/') ? p.startsWith(entry) : p.endsWith(entry),
  );
}
