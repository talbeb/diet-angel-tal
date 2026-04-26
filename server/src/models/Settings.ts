import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  weightGoal: number | null;
  maxYellowStars: number | null;
  maxRedStars: number | null;
  trainingsPerWeek: number | null;
  preferredDays: number[];
  preferredTimeFrom: string | null;
  preferredTimeTo: string | null;
  sessionDurationMin: number | null;
  // server-side only — never sent to client
  googleCalendarMcpToken: string | null;
}

const SettingsSchema = new Schema<ISettings>({
  weightGoal:           { type: Number, default: null },
  maxYellowStars:       { type: Number, default: null },
  maxRedStars:          { type: Number, default: null },
  trainingsPerWeek:     { type: Number, default: null },
  preferredDays:        { type: [Number], default: [] },
  preferredTimeFrom:    { type: String, default: null },
  preferredTimeTo:      { type: String, default: null },
  sessionDurationMin:   { type: Number, default: null },
  googleCalendarMcpToken: { type: String, default: null },
});

export default mongoose.model<ISettings>('Settings', SettingsSchema);
