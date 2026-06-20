import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import userRoutes from './routes/userRoutes';
import merchantRoutes from './routes/merchantRoutes';
import merchantServicesRoutes from './routes/merchantServicesRoutes';
import merchantSubscriptionRoutes from './routes/merchantSubscriptionRoutes';
import ticketTimeslotRoutes from './routes/ticketTimeslotRoutes';
import ticketCategoryRoutes from './routes/ticketCategoryRoutes';
import merchantDeviceRoutes from './routes/merchantDeviceRoutes';
import ticketRoutes from './routes/ticketRoutes';
import ticketDetailRoutes from './routes/ticketDetailRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import invoiceDetailRoutes from './routes/invoiceDetailRoutes';
import documentRoutes from './routes/documentRoutes';
import countryRoutes from './routes/countryRoutes';
import stateRoutes from './routes/stateRoutes';
import userTypeRoutes from './routes/userTypeRoutes';
import merchantEnquiryRoutes from './routes/merchantEnquiryRoutes';
import merchantServiceHolidayRoutes from './routes/merchantServiceHolidayRoutes';
import merchantServicePictureRoutes from './routes/merchantServicePictureRoutes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';


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
import { signInUser, signOutUser, generateGuestToken } from './controllers/userController';
app.post('/api/login', signInUser);
app.post('/api/logout', signOutUser);
app.post('/api/guestLogin', generateGuestToken);

// Public/Semi-public routes
app.use('/api', merchantEnquiryRoutes);
app.use('/api', countryRoutes);
app.use('/api', stateRoutes);
app.use('/api', userTypeRoutes);
app.use('/api/documents', documentRoutes);

// Mount Protected Routes
app.use('/api', userRoutes);
app.use('/api', merchantRoutes);
app.use('/api', merchantServicesRoutes);
app.use('/api', merchantSubscriptionRoutes);
app.use('/api', ticketTimeslotRoutes);
app.use('/api', ticketCategoryRoutes);
app.use('/api', merchantDeviceRoutes);
app.use('/api', ticketRoutes);
app.use('/api', ticketDetailRoutes);
app.use('/api', invoiceRoutes);
app.use('/api', invoiceDetailRoutes);
app.use('/api', merchantServiceHolidayRoutes);
app.use('/api', merchantServicePictureRoutes);




app.listen(PORT, () => {
  console.log(`Server running smoothly http://localhost:${PORT}/`);
  console.log(`Docs available on http://localhost:${PORT}/api-docs`);
});