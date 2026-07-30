import { Router } from 'express';
import { z } from 'zod';
import { getPaymentGateways } from '../controllers/paymentGatewayController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from '../middleware/rateLimitMiddleware';

const router = Router();

const getGatewaysSchema = z.object({
  query: z.object({
    status: z.enum(['true', 'false']).optional(),
  }),
});

// Scoped to the same roles that can create/edit merchant payment gateway
// mappings, since populating that form's gateway dropdown is the only
// current consumer of this list.
router.get('/payment-gateways', authorizeRoles(1, 2, 3), validate(getGatewaysSchema), apiRateLimiter(), getPaymentGateways);

export default router;
