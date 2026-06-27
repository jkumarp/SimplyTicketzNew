import { Router } from 'express';
import { createMerchantSubscription, updateMerchantSubscription, getMerchantSubscriptions, getActiveMerchantSubscriptions } from '../controllers/merchantSubscriptionController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/merchant-subscriptions', authorizeRoles(1,2,3,4,5), getMerchantSubscriptions);
router.get('/merchant-active-subscriptions', authorizeRoles(1,2,3,4,5,6,7), getActiveMerchantSubscriptions);
router.post('/merchant-subscriptions', authorizeRoles(1,2,3,4,5), createMerchantSubscription);
router.put('/merchant-subscriptions/:id', authorizeRoles(1,2,3,4,5), updateMerchantSubscription);

export default router;