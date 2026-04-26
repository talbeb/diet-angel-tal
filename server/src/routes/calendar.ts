import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import Settings from '../models/Settings';

const router = Router();

// Direct Anthropic client (bypasses Wix proxy) for MCP-enabled calls
let _directClient: Anthropic | null = null;
function getDirectClient(): Anthropic {
  if (!_directClient) {
    _directClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _directClient;
}

const MCP_SERVER_URL = 'https://mcp.anthropic.com/google-calendar';
const MODEL = 'claude-opus-4-6';

// Run a Claude agentic loop with Google Calendar MCP tools until Claude stops calling tools.
// Returns the final text response.
async function runCalendarAgentLoop(
  messages: Anthropic.MessageParam[],
  authToken: string | null,
  allowedTools: string[],
): Promise<{ text: string; toolResults: Record<string, unknown> }> {
  const mcpServer: Record<string, unknown> = { type: 'url', url: MCP_SERVER_URL };
  if (authToken) mcpServer.authorization_token = authToken;

  const allMessages = [...messages];
  const toolResults: Record<string, unknown> = {};

  for (let i = 0; i < 10; i++) {
    const response = await (getDirectClient().beta.messages as any).create({
      model: MODEL,
      max_tokens: 4096,
      betas: ['mcp-client-2025-04-04'],
      mcp_servers: [mcpServer],
      allowed_tools: allowedTools.map((name) => ({ type: 'mcp', server_name: 'google-calendar', name })),
      messages: allMessages,
    });

    allMessages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason !== 'tool_use') {
      const text = response.content
        .filter((b: { type: string }) => b.type === 'text')
        .map((b: { type: string; text: string }) => b.text)
        .join('');
      return { text, toolResults };
    }

    // Process tool results
    const toolUseBlocks = response.content.filter((b: { type: string }) => b.type === 'tool_use');
    const toolResultContents: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks as Array<{ id: string; name: string; input: unknown }>) {
      // Capture tool results (e.g. auth URLs)
      toolResults[block.name] = block.input;
      toolResultContents.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: 'Tool executed successfully.',
      });
    }

    allMessages.push({ role: 'user', content: toolResultContents });
  }

  return { text: '', toolResults };
}

// ---------------------------------------------------------------------------
// GET /api/calendar/status
// ---------------------------------------------------------------------------
router.get('/calendar/status', async (_req: Request, res: Response) => {
  const settings = await Settings.findOne();
  res.json({ connected: !!(settings?.googleCalendarMcpToken) });
});

// ---------------------------------------------------------------------------
// GET /api/calendar/auth-url
// Initiates OAuth: Claude calls authenticate tool, returns the URL to the client.
// ---------------------------------------------------------------------------
router.get('/calendar/auth-url', async (_req: Request, res: Response) => {
  try {
    const { toolResults } = await runCalendarAgentLoop(
      [{ role: 'user', content: 'Please authenticate with Google Calendar so I can access my calendar.' }],
      null,
      ['authenticate'],
    );

    // The authenticate tool result contains an auth URL
    const authResult = toolResults['authenticate'] as Record<string, unknown> | undefined;
    const authUrl = authResult?.url ?? authResult?.auth_url ?? authResult?.authorization_url;

    if (!authUrl) {
      res.status(500).json({ error: 'Could not retrieve authentication URL from MCP.' });
      return;
    }

    res.json({ url: authUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Calendar auth-url error:', msg);
    res.status(500).json({ error: 'Failed to initiate calendar authentication.', detail: msg });
  }
});

// ---------------------------------------------------------------------------
// POST /api/calendar/connect
// Called after user completes OAuth. Stores the resulting token.
// Body: { token: string }
// ---------------------------------------------------------------------------
router.post('/calendar/connect', async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };

  if (!token) {
    res.status(400).json({ error: 'token is required.' });
    return;
  }

  await Settings.findOneAndUpdate({}, { googleCalendarMcpToken: token }, { upsert: true });
  res.json({ connected: true });
});

// ---------------------------------------------------------------------------
// POST /api/calendar/disconnect
// ---------------------------------------------------------------------------
router.post('/calendar/disconnect', async (_req: Request, res: Response) => {
  await Settings.findOneAndUpdate({}, { googleCalendarMcpToken: null });
  res.json({ connected: false });
});

// ---------------------------------------------------------------------------
// GET /api/calendar/suggestions
// Uses Claude + Google Calendar MCP to fetch free/busy and suggest training slots.
// ---------------------------------------------------------------------------
router.get('/calendar/suggestions', async (_req: Request, res: Response) => {
  const settings = await Settings.findOne();

  if (!settings?.googleCalendarMcpToken) {
    res.status(401).json({ error: 'Google Calendar not connected.' });
    return;
  }

  const {
    trainingsPerWeek,
    preferredDays,
    preferredTimeFrom,
    preferredTimeTo,
    sessionDurationMin,
    googleCalendarMcpToken,
  } = settings;

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

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const preferredDayNames = (preferredDays ?? []).map((d: number) => dayNames[d]).join(', ') || 'any day';

  const prompt = `I want to schedule ${remaining} training session(s) this week.
My preferences:
- Preferred days: ${preferredDayNames}
- Preferred time window: ${preferredTimeFrom ?? '07:00'} – ${preferredTimeTo ?? '21:00'}
- Session duration: ${sessionDurationMin ?? 60} minutes

Please:
1. Fetch my calendar events for the next 7 days to see what times are busy.
2. Identify free time slots that fit my preferences and have enough time for a ${sessionDurationMin ?? 60}-minute session.
3. Return ONLY a valid JSON array (no markdown, no explanation) with up to ${remaining} best suggestions:
[{"date":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm","reason":"brief reason"}]

Important: Only pass busy/free time information from the calendar. Do not include event titles or descriptions in your reasoning.`;

  try {
    const { text } = await runCalendarAgentLoop(
      [{ role: 'user', content: prompt }],
      googleCalendarMcpToken,
      ['list_events', 'list_calendars'],
    );

    let suggestions: unknown[];
    try {
      suggestions = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) {
        res.status(500).json({ error: 'Failed to parse suggestions from AI.', raw: text });
        return;
      }
      suggestions = JSON.parse(match[0]);
    }

    res.json({ suggestions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Calendar suggestions error:', msg);
    res.status(500).json({ error: 'Failed to get calendar suggestions.', detail: msg });
  }
});

export default router;
