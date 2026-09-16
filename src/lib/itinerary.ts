import { API_URL } from './api';
import type { ShowDetail } from '@/types/api';

const BASE_PATH: Record<string, string> = {
  SHOW: '/shows',
  RECORDING: '/recordings',
  PRACTICE: '/practices',
};

function eventPath(show: Pick<ShowDetail, 'type' | 'id'>): string {
  return `${BASE_PATH[show.type] ?? '/shows'}/${show.id}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Mirrors the web app's buildItineraryMessage exactly (see tour-calendar's
 * src/lib/itinerary.ts) — title/date, load-in/doors/set, a Maps link for the
 * venue, and a link back to the show on the web app. Plain URLs so Messages
 * auto-linkifies them as tappable.
 */
export function buildItineraryMessage(show: ShowDetail): string {
  const fullAddress = [
    show.venueAddress,
    [show.venue, show.city, show.state, show.country].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .join(', ');

  return [
    `${show.title} — ${formatDate(show.date)}`,
    [
      show.loadInTime && `Load-in ${formatTime(show.loadInTime)}`,
      show.doorsTime && `Doors ${formatTime(show.doorsTime)}`,
      show.setTime && `Set ${formatTime(show.setTime)}`,
    ]
      .filter(Boolean)
      .join(' · '),
    [show.venue, show.city, show.state].filter(Boolean).join(', '),
    fullAddress && `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`,
    `Details: ${API_URL}${eventPath(show)}`,
  ]
    .filter(Boolean)
    .join('\n');
}
