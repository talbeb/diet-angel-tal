import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import Meal from '../models/Meal';

const router = Router();

let _anthropic: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: 'https://www.wixapis.com/anthropic',
    });
  }
  return _anthropic;
}

// ---------------------------------------------------------------------------
// Minimal multipart/form-data parser (no external dependency)
// ---------------------------------------------------------------------------
interface ParsedFile {
  buffer: Buffer;
  mimeType: string;
}

function indexOf(haystack: Buffer, needle: Buffer, start = 0): number {
  for (let i = start; i <= haystack.length - needle.length; i++) {
    if (haystack.slice(i, i + needle.length).equals(needle)) return i;
  }
  return -1;
}

function parseMultipart(body: Buffer, contentType: string): ParsedFile | null {
  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
  if (!boundaryMatch) return null;

  const boundary = Buffer.from('--' + boundaryMatch[1]);
  const crlfcrlf = Buffer.from('\r\n\r\n');

  let pos = 0;
  while (pos < body.length) {
    const bStart = indexOf(body, boundary, pos);
    if (bStart === -1) break;
    pos = bStart + boundary.length;

    if (body[pos] === 0x0d && body[pos + 1] === 0x0a) pos += 2;
    else break;

    const headersEnd = indexOf(body, crlfcrlf, pos);
    if (headersEnd === -1) break;

    const headerBlock = body.slice(pos, headersEnd).toString('latin1');
    pos = headersEnd + crlfcrlf.length;

    const nextBoundary = indexOf(body, Buffer.from('\r\n--' + boundaryMatch[1]), pos);
    if (nextBoundary === -1) break;

    const partData = body.slice(pos, nextBoundary);
    pos = nextBoundary;

    if (!headerBlock.toLowerCase().includes('name="image"')) continue;

    const ctMatch = headerBlock.match(/Content-Type:\s*([^\r\n]+)/i);
    const mimeType = ctMatch ? ctMatch[1].trim() : 'image/jpeg';

    return { buffer: partData, mimeType };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------
const ANALYSIS_PROMPT = `You are a nutrition expert. Analyze this food image and identify all visible food items and ingredients.

For each food item return a JSON array with this exact structure:
[
  {
    "name": "שם בעברית / English name",
    "amount": "estimated portion visible in image (e.g., 'חצי כוס / ½ cup', 'פרוסה אחת / 1 slice', '100 גרם / 100g')",
    "kcal": <estimated calories for that portion as integer>,
    "dominant_macro": "<one of: carb, fat, protein, free>"
  }
]

Classification rules for dominant_macro:
- "carb": bread, rice, pasta, potatoes, corn, sweet fruits (banana, grapes, mango), pastries, crackers, cereals
- "fat": oils, butter, avocado, nuts, seeds, fatty meats, cheese, cream, coconut
- "protein": chicken breast, turkey, fish, tuna, lean beef, eggs (whole), legumes (lentils, beans, chickpeas)
- "free": non-starchy vegetables (cucumber, tomato, lettuce, zucchini, peppers, broccoli, cauliflower, spinach), egg whites, herbs

Notes:
- Egg whites alone = "free"
- Whole eggs = "protein"
- For mixed dishes: identify the dominant component by calorie contribution
- Be conservative — estimate only what is visible
- Return ONLY a valid JSON array, no explanation, no markdown fences.`;

// ---------------------------------------------------------------------------
// POST /api/analyze-image
// ---------------------------------------------------------------------------
router.post(
  '/analyze-image',
  (req: Request, _res: Response, next) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      (req as Request & { rawBody: Buffer }).rawBody = Buffer.concat(chunks);
      next();
    });
    req.on('error', next);
  },
  async (req: Request, res: Response) => {
    const raw = (req as Request & { rawBody: Buffer }).rawBody;
    const contentType = req.headers['content-type'] ?? '';

    const file = parseMultipart(raw, contentType);
    if (!file) {
      res.status(400).json({ error: 'No image file provided.' });
      return;
    }

    try {
      const message = await getClient().messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: file.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: file.buffer.toString('base64'),
                },
              },
              { type: 'text', text: ANALYSIS_PROMPT },
            ],
          },
        ],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';

      let ingredients: unknown[];
      try {
        ingredients = JSON.parse(text);
      } catch {
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) {
          res.status(500).json({ error: 'Failed to parse AI response.', raw: text });
          return;
        }
        ingredients = JSON.parse(match[0]);
      }

      res.json({ ingredients });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Analyze error:', message);
      res.status(500).json({ error: 'Image analysis failed.', detail: message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/analyze/add-meal
// ---------------------------------------------------------------------------
router.post('/analyze/add-meal', async (req: Request, res: Response) => {
  const { date, time, name, yellowStars, redStars } = req.body as {
    date: string;
    time: string;
    name: string;
    yellowStars: number;
    redStars: number;
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    return;
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    res.status(400).json({ error: 'Invalid time format. Use HH:mm.' });
    return;
  }
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Meal name is required.' });
    return;
  }

  const created = await Meal.create({
    date,
    meal: 'analyzed',
    time,
    yellowStars: Math.max(0, Math.round(yellowStars)),
    redStars: Math.max(0, Math.round(redStars)),
    free: name.trim(),
  });

  res.status(201).json(created);
});

export default router;
