import { Router } from 'express';
import { createMerchantSubscription, updateMerchantSubscription, getMerchantSubscriptions, getActiveMerchantSubscriptions } from '../controllers/merchantSubscriptionController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/merchant-subscriptions', authorizeRoles(1,2,3,4,5,6),apiRateLimiter(), getMerchantSubscriptions);
router.get('/merchant-active-subscriptions', authorizeRoles(1,2,3,4,5,6,7),apiRateLimiter(), getActiveMerchantSubscriptions);
router.post('/merchant-subscriptions', authorizeRoles(1,2,3,4,5,6),apiRateLimiter(), createMerchantSubscription);
router.put('/merchant-subscriptions/:id', authorizeRoles(1,2,3,4,5,6),apiRateLimiter(), updateMerchantSubscription);

export default router;