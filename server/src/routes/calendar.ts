import { Router, Request, Response } from 'express';
import Settings from '../models/Settings';
import {
  getAuthUrl,
  exchangeCode,
  fetchEvents,
  findFreeSlots,
} from '../services/googleCalendar';

const router = Router();

const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

// ---------------------------------------------------------------------------
// GET /api/calendar/status
// ---------------------------------------------------------------------------
router.get('/calendar/status', async (_req: Request, res: Response) => {
  const settings = await Settings.findOne();
  res.json({ connected: !!(settings?.googleCalendarRefreshToken) });
});

// ---------------------------------------------------------------------------
// GET /api/calendar/auth-url
// Returns the Google OAuth2 consent URL.
// ---------------------------------------------------------------------------
router.get('/calendar/auth-url', async (_req: Request, res: Response) => {
  try {
    const url = getAuthUrl();
    res.json({ url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Calendar auth-url error:', msg);
    res.status(500).json({ error: 'Failed to generate auth URL.', detail: msg });
  }
});

// ---------------------------------------------------------------------------
// GET /api/calendar/oauth-callback
// Google redirects here after user authorizes. Exchanges code for tokens,
// stores refresh token, then redirects back to the client.
// ---------------------------------------------------------------------------
router.get('/calendar/oauth-callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const error = req.query.error as string | undefined;

  if (error) {
    res.redirect(`${CLIENT_URL}/fitness?calendarError=${encodeURIComponent(error)}`);
    return;
  }

  if (!code) {
    res.redirect(`${CLIENT_URL}/fitness?calendarError=no_code`);
    return;
  }

  try {
    const tokens = await exchangeCode(code);

    if (!tokens.refresh_token) {
      console.warn('No refresh token returned — user may have already authorized before.');
    }

    await Settings.findOneAndUpdate(
      {},
      {
        googleCalendarRefreshToken: tokens.refresh_token ?? null,
      },
      { upsert: true },
    );

    res.redirect(`${CLIENT_URL}/fitness?calendarConnected=true`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('OAuth callback error:', msg);
    res.redirect(`${CLIENT_URL}/fitness?calendarError=${encodeURIComponent('Token exchange failed')}`);
  }
});

// ---------------------------------------------------------------------------
// POST /api/calendar/disconnect
// ---------------------------------------------------------------------------
router.post('/calendar/disconnect', async (_req: Request, res: Response) => {
  await Settings.findOneAndUpdate({}, { googleCalendarRefreshToken: null });
  res.json({ connected: false });
});

// ---------------------------------------------------------------------------
// GET /api/calendar/suggestions
// Fetches calendar events and algorithmically finds free training slots.
// ---------------------------------------------------------------------------
router.get('/calendar/suggestions', async (_req: Request, res: Response) => {
  const settings = await Settings.findOne();

  if (!settings?.googleCalendarRefreshToken) {
    res.status(401).json({ error: 'Google Calendar not connected.' });
    return;
  }

  const {
    trainingsPerWeek,
    preferredDays,
    preferredTimeFrom,
    preferredTimeTo,
    sessionDurationMin,
    googleCalendarRefreshToken,
  } = settings;

  // Check how many trainings are already confirmed this week
  const Training = (await import('../models/Training')).default;
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = new Date(weekStart.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const trainingsThisWeek = await Training.countDocuments({
    date: { $gte: weekStartStr, $lt: weekEndStr },
  });

  const remaining = (trainingsPerWeek ?? 3) - trainingsThisWeek;
  if (remaining <= 0) {
    res.json({ suggestions: [], message: 'Training target already reached for this week.' });
    return;
  }

  try {
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 86400000);

    const busySlots = await fetchEvents(googleCalendarRefreshToken, now, weekAhead);

    const suggestions = findFreeSlots(
      busySlots,
      preferredDays ?? [],
      preferredTimeFrom ?? '07:00',
      preferredTimeTo ?? '21:00',
      sessionDurationMin ?? 60,
      remaining,
    );

    res.json({ suggestions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Calendar suggestions error:', msg);
    res.status(500).json({ error: 'Failed to get calendar suggestions.', detail: msg });
  }
});

export default router;
