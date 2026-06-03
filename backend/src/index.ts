import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import userRoutes from './routes/userRoutes';
import merchantRoutes from './routes/merchantRoutes';
import merchantServicesRoutes from './routes/merchantServicesRoutes';
import merchantSubscriptionRoutes from './routes/merchantSubscriptionRoutes';
import ticketTimeslotRoutes from './routes/ticketTimeslotRoutes';
import documentRoutes from './routes/documentRoutes';
import countryRoutes from './routes/countryRoutes';
import stateRoutes from './routes/stateRoutes';
import userTypeRoutes from './routes/userTypeRoutes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { authorizeRoles } from './middleware/authMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Explicitly allow Authorization header in CORS
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Public Auth Routes
import { signInUser, signOutUser } from './controllers/userController';
app.post('/api/login', signInUser);
app.post('/api/logout', signOutUser);

// Mount Protected Routes
app.use('/api', authorizeRoles([1, 2]), userRoutes);
app.use('/api', authorizeRoles([1, 2]), merchantRoutes);
app.use('/api', authorizeRoles([1, 2]), merchantServicesRoutes);
app.use('/api', authorizeRoles([1, 2]), merchantSubscriptionRoutes);
app.use('/api', authorizeRoles([1, 2]), ticketTimeslotRoutes);

// Other master data routes
app.use('/api', countryRoutes);
app.use('/api', stateRoutes);
app.use('/api', userTypeRoutes);
app.use('/api/documents', documentRoutes);

app.listen(PORT, () => {
  console.log(`Server running smoothly http://localhost:${PORT}/`);
  console.log(`Docs available on http://localhost:${PORT}/api-docs`);
});