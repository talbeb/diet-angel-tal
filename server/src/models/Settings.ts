import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  weightGoal: number | null;
  maxYellowStars: number | null;
  maxRedStars: number | null;
}

const SettingsSchema = new Schema<ISettings>({
  weightGoal:    { type: Number, default: null },
  maxYellowStars: { type: Number, default: null },
  maxRedStars:    { type: Number, default: null },
});

export default mongoose.model<ISettings>('Settings', SettingsSchema);
