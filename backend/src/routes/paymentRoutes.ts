import { Router } from 'express';
import { z } from 'zod';
import { initiatePayment, getPaymentStatus, easebuzzReturn } from '../controllers/paymentController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from '../middleware/rateLimitMiddleware';

const router = Router();

const initiateSchema = z.object({
  body: z.object({
    invoice_id: z.number().int().positive(),
  }),
});

const statusSchema = z.object({
  query: z.object({
    invoiceId: z.string().regex(/^\d+$/, 'invoiceId must be numeric'),
    gateway: z.string().max(20).optional(),
    orderId: z.string().max(100).optional(),
    txnid: z.string().max(100).optional(),
  }),
});

// Role 7 (guest) included - both endpoints are called from the public
// customer self-checkout flow (CustomerTicketBooking.tsx), the same reason
// role 7 is on POST /tickets/book.
router.post('/payments/initiate', authorizeRoles(1, 2, 3, 4, 5, 7), validate(initiateSchema), apiRateLimiter(), initiatePayment);
router.get('/payments/status', authorizeRoles(1, 2, 3, 4, 5, 7), validate(statusSchema), apiRateLimiter(), getPaymentStatus);

// Easebuzz's own server POSTs the payment result here (surl/furl) - there's
// no user session/JWT to check, so this route is intentionally unauthenticated.
// Rate-limited only.
router.post('/payments/easebuzz-return', apiRateLimiter(), easebuzzReturn);

export default router;
