import mongoose, { Document } from 'mongoose';

export interface IMealCatalogItem extends Document {
  mealName: string;
  amount: string;
  numberOfYellowStars: number;
  numberOfRedStars: number;
  free: boolean;
  category: string;
}

const MealCatalogItemSchema = new mongoose.Schema<IMealCatalogItem>({
  mealName: { type: String, required: true },
  amount: { type: String, required: true },
  numberOfYellowStars: { type: Number, required: true, min: 0 },
  numberOfRedStars: { type: Number, required: true, min: 0 },
  free: { type: Boolean, required: true },
  category: { type: String, default: '' },
});

MealCatalogItemSchema.index({ mealName: 1, amount: 1 }, { unique: true });

export default mongoose.model<IMealCatalogItem>('MealCatalogItem', MealCatalogItemSchema);
