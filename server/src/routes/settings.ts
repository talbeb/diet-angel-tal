import { Router, Request, Response } from 'express';
import Settings from '../models/Settings';

const router = Router();

// GET /api/settings — returns the single settings doc (creates default if missing)
router.get('/settings', async (_req: Request, res: Response) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ weightGoal: null, maxYellowStars: null, maxRedStars: null });
  }
  res.json(settings);
});

// PUT /api/settings — upsert
router.put('/settings', async (req: Request, res: Response) => {
  const { weightGoal, maxYellowStars, maxRedStars } = req.body as {
    weightGoal: number | null;
    maxYellowStars: number | null;
    maxRedStars: number | null;
  };

  const settings = await Settings.findOneAndUpdate(
    {},
    { weightGoal, maxYellowStars, maxRedStars },
    { new: true, upsert: true }
  );
  res.json(settings);
});

export default router;
