import { Router, Request, Response } from 'express';
import MealCatalogItem from '../models/MealCatalogItem';

const router = Router();

// GET /api/meal-catalog
// Query params:
//   ?q=text        prefix search on mealName (case-insensitive)
//   ?category=text exact match on category
//   ?free=true     only free foods
router.get('/meal-catalog', async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};

  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    filter.mealName = { $regex: req.query.q.trim(), $options: 'i' };
  }

  if (typeof req.query.category === 'string' && req.query.category.trim()) {
    filter.category = req.query.category.trim();
  }

  if (req.query.free === 'true') {
    filter.free = true;
  }

  const items = await MealCatalogItem.find(filter).sort({ mealName: 1 }).lean();
  res.json(items);
});

export default router;
