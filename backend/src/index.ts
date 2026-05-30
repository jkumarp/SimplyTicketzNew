import express, { Request, Response } from 'express';
import cors from 'cors';

import userRoutes from './routes/userRoutes';
import merchantRoutes from './routes/merchantRoutes';
import documentRoutes from './routes/documentRoutes';


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', userRoutes);
app.use('/api', merchantRoutes);
app.use('/api/documents', documentRoutes);



app.listen(PORT, () => {
  console.log(`Server running smoothly on port ${PORT}`);
});