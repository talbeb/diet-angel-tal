import mongoose, { Document, Schema } from 'mongoose';

export interface IWeightEntry extends Document {
  date: string;    // YYYY-MM-DD
  weight: number;  // kg
  createdAt: Date;
}

const WeightEntrySchema = new Schema<IWeightEntry>(
  {
    date:   { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    weight: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

WeightEntrySchema.index({ date: 1 });

export default mongoose.model<IWeightEntry>('WeightEntry', WeightEntrySchema);
