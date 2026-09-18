// Mirrors the tour-calendar backend's JSON shapes exactly (see that repo's
// src/app/api/shows/route.ts, src/app/api/unavailability/route.ts, and
// prisma/schema.prisma for the source of truth).

export type InterestRole = 'ARTIST' | 'BAND' | 'PRODUCER' | 'MANAGER' | 'BOOKING_AGENT';

export type BandRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'TOUR_MANAGER' | 'BOOKING_AGENT' | 'MEMBER';

export interface Band {
  id: string;
  name: string;
  slug: string;
  role: BandRole;
}

// Shape returned by GET/PATCH /api/bands/:id — the band's rider, fetched
// separately from the `Band` list above since most screens don't need it.
export interface BandDetail {
  id: string;
  name: string;
  rider: string | null;
}

// Shape returned by GET /api/mobile/me.
export interface MeResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  bands: Band[];
  activeBandId: string | null;
}

export type EventTypeStr = 'SHOW' | 'RECORDING' | 'PRACTICE';
export type HotelResponsibility = 'PROMOTER' | 'BAND';
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
  venueContactName: string | null;
  venueContactEmail: string | null;
  hotelResponsibility: HotelResponsibility | null;
  hotelName: string | null;
  hotelAddress: string | null;
  hotelLat: number | null;
  hotelLng: number | null;
  hotelNotes: string | null;
  // Free text, appended to via POST /api/shows/:id/guests rather than
  // edited in place — see that endpoint's comment on the backend.
  guestList: string | null;
  createdBy: { id: string; name: string | null };
  release: { id: string; title: string } | null;
  /** Total band membership — used for the "X of Y available" confirm/cancel
   *  controls. See ShowStatusControls.tsx on the web app. */
  memberCount: number;
  /** Every other band member's phone number, for the "Text itinerary"
   *  shortcut — mirrors EventDetail.tsx's own itineraryPhones on web.
   *  Optional: absent against a backend that predates this field. */
  itineraryPhones?: string[];
}

export type LoyaltyType = 'HOTEL' | 'AIRLINE';

export interface LoyaltyAccount {
  id: string;
  type: LoyaltyType;
  program: string;
  memberNumber: string;
}

// Shape returned by GET /api/bands/:id/loyalty — every band member's saved
// loyalty accounts, for the Travel & Rewards screen's "copy while booking"
// list.
export interface BandMemberLoyalty {
  userId: string;
  name: string;
  accounts: LoyaltyAccount[];
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
  createdById: string;
  createdBy: { name: string | null };
}

export interface SongSection {
  id: string;
  songId: string;
  name: string;
  notes: string | null;
  lyrics: string | null;
  position: number;
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
  sections: SongSection[];
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
