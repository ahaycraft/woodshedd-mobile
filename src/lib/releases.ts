import type { ReleaseKind, ReleaseStatus } from '@/types/api';

// Mirrors the tour-calendar backend's RELEASE_KINDS/RELEASE_STATUSES (see
// that repo's src/lib/releases.ts) — same order and wording as the web app.
export const releaseKindLabel: Record<ReleaseKind, string> = {
  ALBUM: 'Album',
  EP: 'EP',
  SINGLE: 'Single',
  GROUP: 'Group',
};

export const RELEASE_STATUSES: ReleaseStatus[] = [
  'PLANNING',
  'WRITING',
  'TRACKING',
  'MIXING',
  'RELEASED',
];

export const releaseStatusLabel: Record<ReleaseStatus, string> = {
  PLANNING: 'Planning',
  WRITING: 'Writing',
  TRACKING: 'Tracking',
  MIXING: 'Mixing',
  RELEASED: 'Released',
};

// Same muted status palette used for songs elsewhere in the app.
export const releaseStatusColor: Record<ReleaseStatus, string> = {
  PLANNING: '#60646C',
  WRITING: '#5b6f99',
  TRACKING: '#c2894a',
  MIXING: '#836c92',
  RELEASED: '#4d7c63',
};
