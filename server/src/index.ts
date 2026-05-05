import path from 'path';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import mealsRouter from './routes/meals';
import settingsRouter from './routes/settings';
import weightRouter from './routes/weight';
import analyzeRouter from './routes/analyze';
import calendarRouter from './routes/calendar';
import trainingRouter from './routes/training';
import mealCatalogRouter from './routes/mealCatalog';
import MealCatalogItem from './models/MealCatalogItem';

dotenv.config();

if (!process.env.ANTHROPIC_API_KEY) {
  try {
    process.env.ANTHROPIC_API_KEY = execSync(
      'security find-generic-password -a "$USER" -s ANTHROPIC_API_KEY -w',
      { shell: '/bin/zsh', stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString().trim();
    console.log('ANTHROPIC_API_KEY loaded from macOS Keychain');
  } catch {
    console.warn('Warning: ANTHROPIC_API_KEY not set and not found in Keychain');
  }
}

// Feature flag — flip to true when Google Calendar integration is ready
const ENABLE_CALENDAR = false;

// Load Google OAuth credentials from Keychain if not in env
if (ENABLE_CALENDAR) {
  for (const key of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] as const) {
    if (!process.env[key]) {
      try {
        process.env[key] = execSync(
          `security find-generic-password -a "$USER" -s ${key} -w`,
          { shell: '/bin/zsh', stdio: ['pipe', 'pipe', 'pipe'] }
        ).toString().trim();
        console.log(`${key} loaded from macOS Keychain`);
      } catch {
        console.warn(`Warning: ${key} not set and not found in Keychain`);
      }
    }
  }
}

const app = express();
const PORT = process.env.PORT ?? 3001;
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/diet-angel-tal';

app.use(cors());
app.use(express.json());
app.use('/api', mealsRouter);
app.use('/api', settingsRouter);
app.use('/api', weightRouter);
app.use('/api', analyzeRouter);
if (ENABLE_CALENDAR) app.use('/api', calendarRouter);
app.use('/api', trainingRouter);
app.use('/api', mealCatalogRouter);

// In production, serve the built client
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));

// Test-only endpoint: reset all collections (only enabled for test DB)
if (MONGO_URI.includes('-test')) {
  app.post('/api/test/reset', async (_req, res) => {
    const collections = await mongoose.connection.db!.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db!.collection(col.name).deleteMany({});
    }
    res.json({ ok: true });
  });

  app.post('/api/test/seed-catalog', async (req, res) => {
    await MealCatalogItem.insertMany(req.body);
    res.json({ ok: true });
  });

  console.log('Test reset endpoint enabled (/api/test/reset)');
}

// SPA fallback — serve index.html for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
