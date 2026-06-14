export const AVATAR_GRADIENTS = [
  ['#2563EB', '#7C3AED'],
  ['#10B981', '#06B6D4'],
  ['#F97316', '#EC4899'],
  ['#7C3AED', '#06B6D4'],
  ['#2563EB', '#10B981'],
  ['#EC4899', '#F97316'],
  ['#06B6D4', '#7C3AED'],
  ['#F97316', '#2563EB'],
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
