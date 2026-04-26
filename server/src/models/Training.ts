import mongoose, { Document, Schema } from 'mongoose';

export interface ITraining extends Document {
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  googleEventId: string | null;
  createdAt: Date;
}

const TrainingSchema = new Schema<ITraining>({
  date:          { type: String, required: true },
  startTime:     { type: String, required: true },
  endTime:       { type: String, required: true },
  durationMin:   { type: Number, required: true },
  googleEventId: { type: String, default: null },
  createdAt:     { type: Date, default: Date.now },
});

TrainingSchema.index({ date: 1 });

export default mongoose.model<ITraining>('Training', TrainingSchema);
