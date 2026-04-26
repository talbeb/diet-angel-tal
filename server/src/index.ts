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

const app = express();
const PORT = process.env.PORT ?? 3001;
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/diet-angel-tal';

app.use(cors());
app.use(express.json());
app.use('/api', mealsRouter);
app.use('/api', settingsRouter);
app.use('/api', weightRouter);
app.use('/api', analyzeRouter);
app.use('/api', calendarRouter);
app.use('/api', trainingRouter);

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
