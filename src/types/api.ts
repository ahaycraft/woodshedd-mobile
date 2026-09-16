// Mirrors the tour-calendar backend's JSON shapes exactly (see that repo's
// src/app/api/shows/route.ts, src/app/api/unavailability/route.ts, and
// prisma/schema.prisma for the source of truth).

export type InterestRole = 'ARTIST' | 'BAND' | 'PRODUCER' | 'MANAGER' | 'BOOKING_AGENT';

export type EventTypeStr = 'SHOW' | 'RECORDING' | 'PRACTICE';
export type ShowStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type AvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'PENDING';

export interface ShowAvailability {
  id: string;
  userId: string;
  showId: string;
  status: AvailabilityStatus;
  note: string | null;
  user: { id: string; name: string | null };
}

export interface Show {
  id: string;
  type: EventTypeStr;
  title: string;
  venue: string | null;
  city: string | null;
  state: string | null;
  date: string;
  status: ShowStatus;
  availability: ShowAvailability[];
}

// Shape returned by GET /api/shows/:id — the full Show record. The list
// endpoints (GET /api/shows) only need the narrower `Show` above.
export interface ShowDetail extends Show {
  country: string;
  doorsTime: string | null;
  setTime: string | null;
  loadInTime: string | null;
  guarantee: number | null;
  notes: string | null;
  venueAddress: string | null;
  venueLat: number | null;
  venueLng: number | null;
  createdBy: { id: string; name: string | null };
  release: { id: string; title: string } | null;
}

export interface MemberUnavailability {
  id: string;
  userId: string;
  date: string;
  note: string | null;
  user: { id: string; name: string | null };
}

export type SongStatus = 'IDEA' | 'WRITING' | 'DEMO' | 'READY_TO_TRACK' | 'TRACKED' | 'RELEASED';

interface SongTrack {
  release: { id: string; title: string };
}

// Shape returned by GET /api/songs.
export interface SongListItem {
  id: string;
  title: string;
  status: SongStatus;
  key: string | null;
  tempo: number | null;
  timeSig: string | null;
  updatedAt: string;
  createdBy: { name: string | null };
  _count: { comments: number };
  tracks: SongTrack[];
}

export interface SongComment {
  id: string;
  songId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string | null };
}

export interface SongDemo {
  id: string;
  songId: string;
  label: string | null;
  url: string;
  createdAt: string;
  createdBy: { name: string | null };
}

// Shape returned by GET /api/songs/:id.
export interface SongDetail {
  id: string;
  title: string;
  status: SongStatus;
  key: string | null;
  tempo: number | null;
  timeSig: string | null;
  duration: number | null;
  lyrics: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy: { name: string | null };
  updatedBy: { name: string | null } | null;
  demos: SongDemo[];
  tracks: SongTrack[];
  comments: SongComment[];
}

export type ReleaseKind = 'ALBUM' | 'EP' | 'SINGLE' | 'GROUP';
export type ReleaseStatus = 'PLANNING' | 'WRITING' | 'TRACKING' | 'MIXING' | 'RELEASED';

// Shape returned by GET /api/releases.
export interface ReleaseListItem {
  id: string;
  title: string;
  kind: ReleaseKind;
  status: ReleaseStatus;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { tracks: number };
}

export interface ReleaseTrack {
  id: string;
  position: number;
  song: { id: string; title: string; status: SongStatus; duration: number | null };
}

// Shape returned by GET /api/releases/:id.
export interface ReleaseDetail {
  id: string;
  title: string;
  kind: ReleaseKind;
  status: ReleaseStatus;
  targetDate: string | null;
  notes: string | null;
  createdById: string;
  createdBy: { name: string | null };
  tracks: ReleaseTrack[];
}
