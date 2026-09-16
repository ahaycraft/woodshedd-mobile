// Mirrors the tour-calendar backend's src/lib/arrangement.ts — same preset
// vocabulary and "Verse" -> "Verse 1"/"Verse 2" promotion behavior, so a
// song's arrangement reads the same whether it was built on web or mobile.

export const SECTION_PRESETS = [
  'Intro',
  'Verse',
  'Pre-Chorus',
  'Chorus',
  'Post-Chorus',
  'Bridge',
  'Solo',
  'Instrumental',
  'Breakdown',
  'Outro',
] as const;

export const MAX_SECTION_NAME = 80;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The first "Verse" is added bare; the second promotes the bare one to
 * "Verse 1" and itself becomes "Verse 2", climbing from there. Returns the
 * name for the new section and, when a bare section needs promoting, its
 * id and new name.
 */
export function planPresetAdd(
  preset: string,
  sections: { id: string; name: string }[]
): { name: string; promote?: { id: string; name: string } } {
  const matcher = new RegExp(`^${escapeRegExp(preset)}(?:\\s+(\\d+))?$`, 'i');
  const matches = sections.filter((s) => matcher.test(s.name.trim()));

  if (matches.length === 0) return { name: preset };

  const name = `${preset} ${matches.length + 1}`;
  const bare = matches.find((s) => s.name.trim().toLowerCase() === preset.toLowerCase());
  return bare ? { name, promote: { id: bare.id, name: `${preset} 1` } } : { name };
}

// Same muted palette used for status dots elsewhere, keyed off the
// section's leading word so custom names still land somewhere sensible.
export function sectionAccentColor(name: string): string {
  const head = name.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  switch (head) {
    case 'verse':
      return '#5b6f99';
    case 'chorus':
    case 'post-chorus':
      return '#4d7c63';
    case 'pre-chorus':
      return '#2f7d76';
    case 'bridge':
      return '#836c92';
    case 'solo':
    case 'instrumental':
    case 'breakdown':
      return '#c2894a';
    default:
      return '#60646C';
  }
}
