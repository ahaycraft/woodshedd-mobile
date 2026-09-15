// Mirrors the tour-calendar backend's JSON shapes exactly (see that repo's
// src/app/api/shows/route.ts, src/app/api/unavailability/route.ts, and
// prisma/schema.prisma for the source of truth).

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

export interface MemberUnavailability {
  id: string;
  userId: string;
  date: string;
  note: string | null;
  user: { id: string; name: string | null };
}
