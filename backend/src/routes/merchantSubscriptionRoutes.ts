import { Router } from 'express';
import { z } from 'zod';
import { createMerchantSubscription, updateMerchantSubscription, getMerchantSubscriptions, getActiveMerchantSubscriptions } from '../controllers/merchantSubscriptionController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const subscriptionFields = {
  merchant_id: z.number().int().positive(),
  subscription_id: z.number().int().positive(),
  merchant_service_id: z.number().int().positive(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ticket_encryption_key: z.string().optional().nullable(),
  secret_key: z.string().optional().nullable(),
  secret_value: z.string().optional().nullable(),
  allowed_scanning_device: z.number().int().min(0).optional(),
  allowed_pos_device: z.number().int().min(0).optional(),
  allowed_staff_login: z.number().int().min(0).optional(),
  convinience_fee: z.number().min(0).optional(),
  ticket_refund_sw: z.boolean().optional(),
  update_by: z.number().optional(),
  status_sw: z.boolean().optional(),
};

const createSubscriptionSchema = z.object({
  body: z.object(subscriptionFields),
});

const updateSubscriptionSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object(
    Object.fromEntries(
      Object.entries(subscriptionFields).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()]),
    ),
  ),
});

const getSubscriptionsSchema = z.object({
  query: z.object({
    merchantId: z.string().optional(),
    serviceId: z.string().optional(),
  }),
});

router.get('/merchant-subscriptions', authorizeRoles(1,2,3,4,5,6), validate(getSubscriptionsSchema),apiRateLimiter(), getMerchantSubscriptions);
router.get('/merchant-active-subscriptions', authorizeRoles(1,2,3,4,5,6,7), validate(getSubscriptionsSchema),apiRateLimiter(), getActiveMerchantSubscriptions);
router.post('/merchant-subscriptions', authorizeRoles(1,2,3,4,5,6), validate(createSubscriptionSchema),apiRateLimiter(), createMerchantSubscription);
router.put('/merchant-subscriptions/:id', authorizeRoles(1,2,3,4,5,6), validate(updateSubscriptionSchema),apiRateLimiter(), updateMerchantSubscription);

export default router;
