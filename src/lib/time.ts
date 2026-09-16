export function relativeTime(dateStr: string) {
  const seconds = Math.max(0, (Date.now() - new Date(dateStr).getTime()) / 1000);
  const units: [string, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [label, secondsPerUnit] of units) {
    const value = Math.floor(seconds / secondsPerUnit);
    if (value >= 1) return `${value} ${label}${value === 1 ? '' : 's'} ago`;
  }
  return 'just now';
}
