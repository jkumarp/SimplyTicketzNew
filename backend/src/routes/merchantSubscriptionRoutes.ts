import { Router } from 'express';
import { createMerchantSubscription, updateMerchantSubscription, getMerchantSubscriptions } from '../controllers/merchantSubscriptionController';

const router = Router();

router.get('/merchant-subscriptions', getMerchantSubscriptions);
router.post('/merchant-subscriptions', createMerchantSubscription);
router.put('/merchant-subscriptions/:id', updateMerchantSubscription);

export default router;