import mongoose, { Document, Schema } from 'mongoose';
import { MealType, MEAL_TYPES } from '../data/mealDefinitions';

export interface IMeal extends Document {
  date: string;       // YYYY-MM-DD
  meal: MealType;
  time: string;       // HH:mm
  yellowStars: number;
  redStars: number;
  free: string;
  createdAt: Date;
}

const MealSchema = new Schema<IMeal>(
  {
    date:        { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    meal:        { type: String, required: true, enum: MEAL_TYPES },
    time:        { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    yellowStars: { type: Number, required: true, min: 0 },
    redStars:    { type: Number, required: true, min: 0 },
    free:        { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MealSchema.index({ date: 1 });

export default mongoose.model<IMeal>('Meal', MealSchema);
