import { Router, Request, Response } from 'express';
import Meal from '../models/Meal';
import { MEAL_DEFINITIONS, MEAL_TYPES, MealType } from '../data/mealDefinitions';

const router = Router();

// GET /api/meal-definitions
router.get('/meal-definitions', (_req: Request, res: Response) => {
  res.json(MEAL_DEFINITIONS);
});

// GET /api/meals/:date  (YYYY-MM-DD)
router.get('/meals/:date', async (req: Request, res: Response) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    return;
  }
  const meals = await Meal.find({ date }).sort({ time: 1 });
  res.json(meals);
});

// POST /api/meals
router.post('/meals', async (req: Request, res: Response) => {
  const { date, meal, time, amount, yellowStars: bodyYellow, redStars: bodyRed, free: bodyFree } = req.body as {
    date: string; meal: string; time: string; amount?: string;
    yellowStars?: number; redStars?: number; free?: string;
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    return;
  }
  if (!meal || typeof meal !== 'string') {
    res.status(400).json({ error: 'meal is required.' });
    return;
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    res.status(400).json({ error: 'Invalid time format. Use HH:mm.' });
    return;
  }

  const def = MEAL_DEFINITIONS[meal as MealType];
  const yellowStars = def ? def.yellowStars : (typeof bodyYellow === 'number' ? bodyYellow : 0);
  const redStars    = def ? def.redStars    : (typeof bodyRed   === 'number' ? bodyRed   : 0);
  const free        = def ? def.free        : (bodyFree ?? '');

  const created = await Meal.create({
    date, meal, amount: amount ?? '', time, yellowStars, redStars, free,
  });
  res.status(201).json(created);
});

// DELETE /api/meals/:id
router.delete('/meals/:id', async (req: Request, res: Response) => {
  const deleted = await Meal.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Meal not found.' });
    return;
  }
  res.status(204).send();
});

export default router;
