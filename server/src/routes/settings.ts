import { Router, Request, Response } from 'express';
import Settings from '../models/Settings';

const router = Router();

function stripToken(doc: unknown) {
  if (!doc) return null;
  const obj = typeof (doc as any).toObject === 'function'
    ? (doc as any).toObject()
    : { ...(doc as object) };
  delete (obj as any).googleCalendarMcpToken;
  return obj;
}

router.get('/settings', async (_req: Request, res: Response) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  res.json(stripToken(settings));
});

router.put('/settings', async (req: Request, res: Response) => {
  const {
    weightGoal,
    maxYellowStars,
    maxRedStars,
    trainingsPerWeek,
    preferredDays,
    preferredTimeFrom,
    preferredTimeTo,
    sessionDurationMin,
  } = req.body as {
    weightGoal: number | null;
    maxYellowStars: number | null;
    maxRedStars: number | null;
    trainingsPerWeek: number | null;
    preferredDays: number[];
    preferredTimeFrom: string | null;
    preferredTimeTo: string | null;
    sessionDurationMin: number | null;
  };

  const settings = await Settings.findOneAndUpdate(
    {},
    {
      weightGoal,
      maxYellowStars,
      maxRedStars,
      trainingsPerWeek,
      preferredDays,
      preferredTimeFrom,
      preferredTimeTo,
      sessionDurationMin,
    },
    { new: true, upsert: true }
  );
  res.json(stripToken(settings));
});

export default router;
