import { Router, Request, Response } from 'express';
import WeightEntry from '../models/WeightEntry';

const router = Router();

// GET /api/weight — all entries sorted by date asc
router.get('/weight', async (_req: Request, res: Response) => {
  const entries = await WeightEntry.find().sort({ date: 1 });
  res.json(entries);
});

// POST /api/weight
router.post('/weight', async (req: Request, res: Response) => {
  const { date, weight } = req.body as { date: string; weight: number };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    return;
  }
  if (typeof weight !== 'number' || weight <= 0) {
    res.status(400).json({ error: 'Weight must be a positive number.' });
    return;
  }

  // One entry per day — upsert
  const entry = await WeightEntry.findOneAndUpdate(
    { date },
    { weight },
    { new: true, upsert: true }
  );
  res.status(201).json(entry);
});

// DELETE /api/weight/:id
router.delete('/weight/:id', async (req: Request, res: Response) => {
  const deleted = await WeightEntry.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Entry not found.' });
    return;
  }
  res.status(204).send();
});

export default router;
