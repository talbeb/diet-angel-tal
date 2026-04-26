import { Router, Request, Response } from 'express';
import Training from '../models/Training';

const router = Router();

// Returns ISO week bounds (Mon–Sun) for a given YYYY-MM-DD date string
function weekBounds(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  };
}

// GET /api/training/week?date=YYYY-MM-DD
router.get('/training/week', async (req: Request, res: Response) => {
  const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10);
  const { start, end } = weekBounds(date);
  const trainings = await Training.find({
    date: { $gte: start, $lte: end },
  }).sort({ date: 1, startTime: 1 });
  res.json({ trainings, weekStart: start, weekEnd: end });
});

// POST /api/training — confirm a training slot
// Body: { date, startTime, endTime, durationMin }
router.post('/training', async (req: Request, res: Response) => {
  const { date, startTime, endTime, durationMin } = req.body as {
    date: string;
    startTime: string;
    endTime: string;
    durationMin: number;
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    return;
  }
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    res.status(400).json({ error: 'Invalid time format. Use HH:mm.' });
    return;
  }

  let googleEventId: string | null = null;

  // Attempt to create a Google Calendar event via MCP
  try {
    const Settings = (await import('../models/Settings')).default;
    const settings = await Settings.findOne();
    if (settings?.googleCalendarMcpToken) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const startISO = `${date}T${startTime}:00`;
      const endISO = `${date}T${endTime}:00`;

      const response = await (client.beta.messages as any).create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        betas: ['mcp-client-2025-04-04'],
        mcp_servers: [{
          type: 'url',
          url: 'https://mcp.anthropic.com/google-calendar',
          authorization_token: settings.googleCalendarMcpToken,
        }],
        allowed_tools: [{ type: 'mcp', server_name: 'google-calendar', name: 'create_event' }],
        messages: [{
          role: 'user',
          content: `Create a calendar event titled "🏋️ Training" from ${startISO} to ${endISO}. Return the event ID in your response.`,
        }],
      });

      const text = response.content
        .filter((b: { type: string }) => b.type === 'text')
        .map((b: { type: string; text: string }) => b.text)
        .join('');

      const idMatch = text.match(/event[_\s]?id[:\s]+([a-zA-Z0-9_-]+)/i);
      if (idMatch) googleEventId = idMatch[1];
    }
  } catch (err) {
    console.warn('Google Calendar event creation failed (training saved anyway):', err instanceof Error ? err.message : err);
  }

  const training = await Training.create({ date, startTime, endTime, durationMin, googleEventId });
  res.status(201).json(training);
});

// DELETE /api/training/:id
router.delete('/training/:id', async (req: Request, res: Response) => {
  await Training.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

export default router;
