import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import userRoutes from './routes/userRoutes';
import merchantRoutes from './routes/merchantRoutes';
import documentRoutes from './routes/documentRoutes';
import countryRoutes from './routes/countryRoutes';
import stateRoutes from './routes/stateRoutes';
import userTypeRoutes from './routes/userTypeRoutes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount Routes
app.use('/api', userRoutes);
app.use('/api', merchantRoutes);
app.use('/api', countryRoutes);
app.use('/api', stateRoutes);
app.use('/api', userTypeRoutes);
app.use('/api/documents', documentRoutes);

app.listen(PORT, () => {
  console.log(`Server running smoothly http://localhost:${PORT}/`);
  console.log(`Docs available on http://localhost:${PORT}/api-docs`);
});