import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BACKUP_PATH = path.resolve(__dirname, '../../mealcatalogitems-backup.json');

const MealCatalogItemSchema = new mongoose.Schema({
  mealName: { type: String, required: true },
  amount: { type: String, required: true },
  numberOfYellowStars: { type: Number, required: true, min: 0 },
  numberOfRedStars: { type: Number, required: true, min: 0 },
  free: { type: Boolean, required: true },
  category: { type: String, default: '' },
});
MealCatalogItemSchema.index({ mealName: 1, amount: 1 }, { unique: true });
const MealCatalogItem = mongoose.model('MealCatalogItem', MealCatalogItemSchema);

async function main() {
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/diet-angel-tal';
  console.log(`Connecting to: ${mongoUri.replace(/:\/\/[^@]+@/, '://***@')}\n`);

  await mongoose.connect(mongoUri);

  const lines = fs.readFileSync(BACKUP_PATH, 'utf8').trim().split('\n').filter(l => l.trim());
  console.log(`Backup items: ${lines.length}`);

  const docs = lines.map(line => {
    const doc = JSON.parse(line);
    // Normalize {"$oid":"..."} back to string for upsert key matching
    const id = typeof doc._id === 'object' ? doc._id['$oid'] : doc._id;
    return {
      _id: new mongoose.Types.ObjectId(id),
      mealName: doc.mealName,
      amount: doc.amount,
      numberOfYellowStars: doc.numberOfYellowStars,
      numberOfRedStars: doc.numberOfRedStars,
      free: doc.free,
      category: doc.category ?? '',
    };
  });

  const ops = docs.map(doc => ({
    updateOne: {
      filter: { mealName: doc.mealName, amount: doc.amount },
      update: { $setOnInsert: doc },
      upsert: true,
    },
  }));

  const result = await MealCatalogItem.bulkWrite(ops, { ordered: false });

  console.log(`Inserted : ${result.upsertedCount}`);
  console.log(`Skipped  : ${result.matchedCount} (already existed)`);
  console.log(`\nDone.`);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
