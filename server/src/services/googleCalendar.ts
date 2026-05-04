import { google, calendar_v3 } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const port = process.env.PORT ?? 3001;
  const redirectUri = `http://localhost:${port}/api/calendar/oauth-callback`;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

export async function exchangeCode(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

// ---------------------------------------------------------------------------
// Authenticated calendar client
// ---------------------------------------------------------------------------

function getCalendar(refreshToken: string): calendar_v3.Calendar {
  const auth = getOAuth2Client();
  auth.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: 'v3', auth });
}

// ---------------------------------------------------------------------------
// Fetch events for a time range
// ---------------------------------------------------------------------------

export interface BusySlot {
  start: Date;
  end: Date;
}

export async function fetchEvents(
  refreshToken: string,
  timeMin: Date,
  timeMax: Date,
): Promise<BusySlot[]> {
  const cal = getCalendar(refreshToken);
  const events: BusySlot[] = [];
  let pageToken: string | undefined;

  do {
    const res = await cal.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      pageToken,
    });

    for (const ev of res.data.items ?? []) {
      // All-day events use `date`, timed events use `dateTime`
      const start = ev.start?.dateTime ?? ev.start?.date;
      const end = ev.end?.dateTime ?? ev.end?.date;
      if (start && end) {
        events.push({ start: new Date(start), end: new Date(end) });
      }
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return events;
}

// ---------------------------------------------------------------------------
// Create a calendar event
// ---------------------------------------------------------------------------

export async function createEvent(
  refreshToken: string,
  summary: string,
  startDateTime: string,
  endDateTime: string,
  timeZone = 'Asia/Jerusalem',
): Promise<{ eventId: string }> {
  const cal = getCalendar(refreshToken);

  const res = await cal.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary,
      start: { dateTime: startDateTime, timeZone },
      end: { dateTime: endDateTime, timeZone },
    },
  });

  return { eventId: res.data.id ?? '' };
}

// ---------------------------------------------------------------------------
// Free-slot algorithm
// ---------------------------------------------------------------------------

export interface Suggestion {
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  reason: string;
}

/**
 * Finds free slots in the calendar that match user preferences.
 *
 * Algorithm:
 *  1. Generate candidate days for the next `daysAhead` days, filtering to preferredDays.
 *  2. For each day, define the allowed window [preferredTimeFrom, preferredTimeTo].
 *  3. Walk through busy events that overlap with that window, finding gaps >= sessionDuration.
 *  4. Collect all candidate slots, return top `count`.
 */
export function findFreeSlots(
  busySlots: BusySlot[],
  preferredDays: number[],        // 0=Sun..6=Sat
  preferredTimeFrom: string,      // HH:mm
  preferredTimeTo: string,        // HH:mm
  sessionDurationMin: number,
  count: number,
  daysAhead = 7,
): Suggestion[] {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const suggestions: Suggestion[] = [];
  const sessionMs = sessionDurationMin * 60_000;

  const now = new Date();

  for (let d = 0; d < daysAhead && suggestions.length < count; d++) {
    const candidateDate = new Date(now);
    candidateDate.setDate(now.getDate() + d);

    const dayOfWeek = candidateDate.getDay();
    if (preferredDays.length > 0 && !preferredDays.includes(dayOfWeek)) continue;

    const dateStr = candidateDate.toISOString().slice(0, 10);

    // Build window boundaries
    const [fromH, fromM] = preferredTimeFrom.split(':').map(Number);
    const [toH, toM] = preferredTimeTo.split(':').map(Number);

    const windowStart = new Date(candidateDate);
    windowStart.setHours(fromH, fromM, 0, 0);

    const windowEnd = new Date(candidateDate);
    windowEnd.setHours(toH, toM, 0, 0);

    // If window is in the past (today), shift start to now + 30 min buffer
    if (d === 0) {
      const earliest = new Date(now.getTime() + 30 * 60_000);
      if (earliest > windowStart) windowStart.setTime(earliest.getTime());
      // Round up to next 15-min mark
      const mins = windowStart.getMinutes();
      const remainder = mins % 15;
      if (remainder > 0) windowStart.setMinutes(mins + (15 - remainder), 0, 0);
    }

    if (windowStart.getTime() + sessionMs > windowEnd.getTime()) continue;

    // Filter busy slots that overlap this day's window
    const dayBusy = busySlots
      .filter((s) => s.end > windowStart && s.start < windowEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    // Walk the window, find gaps
    let cursor = windowStart.getTime();

    for (const busy of dayBusy) {
      const gapEnd = busy.start.getTime();
      if (gapEnd - cursor >= sessionMs) {
        // Found a free slot
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor + sessionMs);
        suggestions.push({
          date: dateStr,
          startTime: fmt(slotStart),
          endTime: fmt(slotEnd),
          reason: `Free slot on ${dayNames[dayOfWeek]}`,
        });
        if (suggestions.length >= count) break;
      }
      // Move cursor past this busy block
      cursor = Math.max(cursor, busy.end.getTime());
    }

    // Check gap after last event
    if (suggestions.length < count && windowEnd.getTime() - cursor >= sessionMs) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor + sessionMs);
      suggestions.push({
        date: dateStr,
        startTime: fmt(slotStart),
        endTime: fmt(slotEnd),
        reason: `Free slot on ${dayNames[dayOfWeek]}`,
      });
    }
  }

  return suggestions.slice(0, count);
}

function fmt(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
