import type { SongStatus } from '@/types/api';

// Mirrors the tour-calendar backend's SONG_STATUSES / songStatusLabel (see
// that repo's src/lib/songs.ts) — same order and wording as the web app.
export const SONG_STATUSES: SongStatus[] = [
  'IDEA',
  'WRITING',
  'DEMO',
  'READY_TO_TRACK',
  'TRACKED',
  'RELEASED',
];

export const songStatusLabel: Record<SongStatus, string> = {
  IDEA: 'Idea',
  WRITING: 'Writing',
  DEMO: 'Demo',
  READY_TO_TRACK: 'Ready to track',
  TRACKED: 'Tracked',
  RELEASED: 'Released',
};

// Same muted status palette used for shows/practices elsewhere in the app.
export const songStatusColor: Record<SongStatus, string> = {
  IDEA: '#60646C',
  WRITING: '#5b6f99',
  DEMO: '#836c92',
  READY_TO_TRACK: '#c2894a',
  TRACKED: '#2f7d76',
  RELEASED: '#4d7c63',
};
