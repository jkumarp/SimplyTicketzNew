import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { z } from 'zod';

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
import merchantServiceVoucherRoutes from './routes/merchantServiceVoucherRoutes';
import merchantServiceUserRoutes from './routes/merchantServiceUserRoutes';
import merchantPGMappingRoutes from './routes/merchantPGMappingRoutes';
import paymentGatewayRoutes from './routes/paymentGatewayRoutes';
import paymentRoutes from './routes/paymentRoutes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { redisService } from './config/redisClient';
import { apiRateLimiter } from './middleware/rateLimitMiddleware';
import { validate } from './middleware/validate';
import { verifyRecaptcha } from './middleware/recaptchaMiddleware';
// Public Auth Routes
import { signInUser, signOutUser, generateGuestToken } from './controllers/userController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Baseline security headers (HSTS, X-Content-Type-Options, disabled X-Powered-By, etc.)
// crossOriginResourcePolicy is relaxed to "cross-origin" because this is a
// REST API meant to be called from a different origin (the Vite frontend
// runs on its own port/domain, separate from this Express server) - helmet's
// default of "same-origin" makes browsers silently reject every response,
// which surfaces to callers as a generic "Failed to fetch".
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS: restrict to an explicit allowlist via ALLOWED_ORIGINS ("https://a.com,https://b.com").
// Falls back to reflecting the request origin only when no allowlist has been configured,
// so local/dev setups keep working - but this should always be set in production.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Cap request body size to reduce DoS exposure from oversized JSON payloads
app.use(express.json({ limit: '1mb' }));
// Easebuzz's server POSTs the payment result as form data (not JSON) to
// /api/payments/easebuzz-return - see paymentController.easebuzzReturn.
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('A valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(128),
    recaptchaToken: z.string().min(1, 'Please complete the "I am not a robot" verification'),
  }),
});

const guestLoginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('A valid email is required').optional(),
  }),
});

// Public auth routes - rate limited to slow down credential stuffing / brute force
app.post('/api/login', apiRateLimiter(), validate(loginSchema), verifyRecaptcha(), signInUser);
app.post('/api/logout', apiRateLimiter(), signOutUser);
app.post('/api/guestLogin', apiRateLimiter(), validate(guestLoginSchema), generateGuestToken);

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
app.use('/api', merchantServiceVoucherRoutes);
app.use('/api', merchantServiceUserRoutes);
app.use('/api', merchantPGMappingRoutes);
app.use('/api', paymentGatewayRoutes);
app.use('/api', paymentRoutes);

// Error handler must be registered last, after all routes are mounted
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running smoothly http://localhost:${PORT}/`);
  console.log(`Docs available on http://localhost:${PORT}/api-docs`);
});

// Connect to Redis in the background. Route registration above no longer
// waits on this promise - previously all API routes were only mounted
// inside redisService.connect().then(...), which meant the entire app was
// unreachable (and silently so) until Redis finished connecting, and any
// Redis outage at boot would leave every route 404-ing with no explanation.
// The rate limiter already fails open if Redis is unavailable (see
// rateLimitMiddleware.ts), so there's no need to gate startup on it.
redisService.connect().catch((err) => {
  console.error('Failed to connect to Redis - rate limiting will fail open until it recovers:', err);
});
