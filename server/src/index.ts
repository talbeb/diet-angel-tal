import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import mealsRouter from './routes/meals';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/diet-angel-tal';

app.use(cors());
app.use(express.json());
app.use('/api', mealsRouter);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
