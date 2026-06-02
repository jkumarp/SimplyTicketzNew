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
import { authorizeRoles } from './middleware/authMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Public Routes (Login/Logout are inside userRoutes but we handle them carefully)
// Note: In a more complex app, you'd split auth routes from management routes.
// For now, we apply the middleware selectively in the route files or here.

// Mount Routes with Role Protection
// Only Roles 1 (Admin) and 2 (Merchant Admin/Owner) can manage users and merchants
app.use('/api/users', authorizeRoles([1, 2]), userRoutes);
app.use('/api/merchants', authorizeRoles([1, 2]), merchantRoutes);

// Other routes
app.use('/api', countryRoutes);
app.use('/api', stateRoutes);
app.use('/api', userTypeRoutes);
app.use('/api/documents', documentRoutes);

// We need to ensure login/logout remain accessible. 
// Since they were mounted under /api in the previous version, 
// let's mount them explicitly to avoid the middleware.
import { signInUser, signOutUser } from './controllers/userController';
app.post('/api/login', signInUser);
app.post('/api/logout', signOutUser);

app.listen(PORT, () => {
  console.log(`Server running smoothly http://localhost:${PORT}/`);
  console.log(`Docs available on http://localhost:${PORT}/api-docs`);
});