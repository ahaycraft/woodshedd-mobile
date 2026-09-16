import { API_URL } from './api';
import type { ShowDetail } from '@/types/api';

// Same summary/location/timing rules as the web app's .ics export (see
// tour-calendar's src/lib/calendar.ts) — handed straight to the OS's native
// "Add Event" UI (expo-calendar's createEventInCalendarAsync) instead of a
// downloaded .ics file, since mobile has no cookie session to authenticate
// that endpoint with.

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

const STATUS_PREFIX: Record<string, string> = {
  CANCELLED: '[Cancelled] ',
  PENDING: '[Pending] ',
};

const BASE_PATH: Record<string, string> = {
  SHOW: '/shows',
  RECORDING: '/recordings',
  PRACTICE: '/practices',
};

function eventPath(show: Pick<ShowDetail, 'type' | 'id'>): string {
  return `${BASE_PATH[show.type] ?? '/shows'}/${show.id}`;
}

function locationString(show: ShowDetail): string {
  const parts = show.venueAddress
    ? [show.venue, show.venueAddress]
    : [show.venue, show.city, show.state, show.venue || show.city ? show.country : null];
  return parts.filter(Boolean).join(', ');
}

interface Timing {
  allDay: boolean;
  start: Date;
  end: Date;
}

function resolveTiming(show: ShowDetail): Timing {
  const date = new Date(show.date);
  const loadIn = show.loadInTime ? new Date(show.loadInTime) : null;
  const doors = show.doorsTime ? new Date(show.doorsTime) : null;
  const set = show.setTime ? new Date(show.setTime) : null;
  const start = loadIn ?? doors ?? set;
  if (!start) {
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    return { allDay: true, start: date, end };
  }
  const end = set && set.getTime() > start.getTime() ? set : new Date(start.getTime() + DEFAULT_DURATION_MS);
  return { allDay: false, start, end };
}

/** Builds the fields expo-calendar's createEventInCalendarAsync needs. */
export function showToCalendarEvent(show: ShowDetail) {
  const t = resolveTiming(show);
  const location = locationString(show);
  const notes = [show.notes, `Details: ${API_URL}${eventPath(show)}`].filter(Boolean).join('\n\n');

  return {
    title: `${STATUS_PREFIX[show.status] ?? ''}${show.title}`,
    startDate: t.start,
    endDate: t.end,
    allDay: t.allDay,
    ...(location && { location }),
    notes,
  };
}
