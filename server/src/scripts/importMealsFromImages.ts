import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import Anthropic from '@anthropic-ai/sdk';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Load API key from Keychain if not in env (same logic as server/src/index.ts)
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    process.env.ANTHROPIC_API_KEY = execSync(
      'security find-generic-password -a "$USER" -s ANTHROPIC_API_KEY -w',
      { shell: '/bin/zsh', stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString().trim();
  } catch {
    console.warn('Warning: ANTHROPIC_API_KEY not set and not found in Keychain');
  }
}

// Inline the schema so this script is self-contained (no circular model registration issues)
const MealCatalogItemSchema = new mongoose.Schema({
  mealName: { type: String, required: true },
  amount: { type: String, required: true },
  numberOfYellowStars: { type: Number, required: true, min: 0 },
  numberOfRedStars: { type: Number, required: true, min: 0 },
  free: { type: Boolean, required: true },
  category: { type: String, default: '' },
});
MealCatalogItemSchema.index({ mealName: 1, amount: 1 }, { unique: true });
const MealCatalogItem = mongoose.model('MealCatalogItem', MealCatalogItemSchema);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: 'https://www.wixapis.com/anthropic',
});

interface ExtractedItem {
  category: string;
  mealName: string;
  amount: string;
  numberOfYellowStars: number;
  numberOfRedStars: number;
  free: boolean;
}

const PROMPT = `You are reading a screenshot from a Hebrew diet app.

The screen shows a list of food items. For each food row extract:
- category: the text in the colored category banner at the top (e.g. "לחם ודגנים"). If no banner is visible use "". Apply the same category to ALL items from this image.
- mealName: the Hebrew food name (do NOT include the category banner as a meal)
- amount: the portion text shown below the name
- numberOfYellowStars: count of gold/yellow filled stars to the left of the item (full star = 1, half-filled = 0.5, none = 0)
- numberOfRedStars: count of red filled stars to the left of the item (same counting rules)
- free: true if the item has NO stars at all (zero yellow and zero red), false otherwise

Star counting rules:
- A fully filled star = 1
- A half-filled (outline half) star = 0.5
- Count yellow and red independently; some items have both

Return a JSON array only — no markdown, no explanation:
[{"category":"לחם ודגנים","mealName":"...","amount":"...","numberOfYellowStars":0,"numberOfRedStars":1,"free":false}]`;

function isValidStarValue(v: unknown): v is number {
  return typeof v === 'number' && v >= 0 && v % 0.5 === 0;
}

function validateItem(item: unknown): item is ExtractedItem {
  if (!item || typeof item !== 'object') return false;
  const i = item as Record<string, unknown>;
  return (
    typeof i.mealName === 'string' && i.mealName.trim().length > 0 &&
    typeof i.amount === 'string' && i.amount.trim().length > 0 &&
    isValidStarValue(i.numberOfYellowStars) &&
    isValidStarValue(i.numberOfRedStars) &&
    typeof i.free === 'boolean' &&
    typeof i.category === 'string'
  );
}

async function extractFromImage(filePath: string): Promise<ExtractedItem[]> {
  const base64 = fs.readFileSync(filePath).toString('base64');
  const ext = path.extname(filePath).toLowerCase();
  const mimeType: 'image/png' | 'image/jpeg' | 'image/webp' =
    ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
        { type: 'text', text: PROMPT },
      ],
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  let parsed: unknown[];
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error(`Cannot parse JSON from response: ${text.slice(0, 300)}`);
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed)) throw new Error('Response is not a JSON array');
  return parsed.filter(validateItem);
}

async function main() {
  const processAll = process.argv.includes('--all');

  const dirFlag = process.argv.find(a => a.startsWith('--dir='));
  const assetsDir = dirFlag
    ? path.resolve(dirFlag.slice('--dir='.length))
    : path.resolve(__dirname, '../../../.claude/assets');

  const files = fs.readdirSync(assetsDir)
    .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort()
    .map(f => path.join(assetsDir, f));

  if (files.length === 0) {
    console.log(`No image files found in ${assetsDir}`);
    return;
  }

  const toProcess = processAll ? files : files.slice(0, 1);
  console.log(`Processing ${toProcess.length}/${files.length} images (${processAll ? '--all' : 'first only — run with --all to process everything'})\n`);

  const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/diet-angel-tal';
  await mongoose.connect(mongoUri);
  console.log(`Connected to MongoDB: ${mongoUri}\n`);

  let totalUpserted = 0, totalSkipped = 0, totalFailed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const file = toProcess[i];
    process.stdout.write(`[${i + 1}/${toProcess.length}] ${path.basename(file)} … `);

    try {
      const items = await extractFromImage(file);
      let upserted = 0, skipped = 0;

      for (const item of items) {
        try {
          await MealCatalogItem.updateOne(
            { mealName: item.mealName, amount: item.amount },
            { $set: item },
            { upsert: true }
          );
          upserted++;
        } catch {
          skipped++;
        }
      }

      totalUpserted += upserted;
      totalSkipped += skipped;
      console.log(`${items.length} items → ${upserted} upserted, ${skipped} skipped`);

      if (!processAll) {
        console.log('\nExtracted data:');
        console.log(JSON.stringify(items, null, 2));
      }
    } catch (err) {
      totalFailed++;
      console.log(`FAILED: ${(err as Error).message}`);
    }
  }

  console.log(`\n─── Summary ───────────────────────────────`);
  console.log(`Files processed : ${toProcess.length - totalFailed}/${toProcess.length}`);
  console.log(`Items upserted  : ${totalUpserted}`);
  console.log(`Items skipped   : ${totalSkipped}`);
  console.log(`Files failed    : ${totalFailed}`);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
