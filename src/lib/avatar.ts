export const AVATAR_GRADIENTS = [
  ['#0067E0', '#0067E0'],
  ['#10B981', '#0067E0'],
  ['#F59E0B', '#0067E0'],
  ['#0067E0', '#0067E0'],
  ['#0067E0', '#10B981'],
  ['#0067E0', '#F59E0B'],
  ['#0067E0', '#0067E0'],
  ['#F59E0B', '#0067E0'],
];

export function avatarGradient(name: string, index?: number): string {
  if (index !== undefined) {
    const g = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
    return `linear-gradient(135deg,${g[0]},${g[1]})`;
  }
  const i = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
  return `linear-gradient(135deg,${AVATAR_GRADIENTS[i][0]},${AVATAR_GRADIENTS[i][1]})`;
}

export function initialsAvatar(name: string): string {
  return (name || '?').split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}
