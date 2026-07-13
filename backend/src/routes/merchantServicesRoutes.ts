import { Router } from 'express';
import { createMerchantService, updateMerchantService, getMerchantServices, getMerchantServiceBookingCal,getMerchantServicesTaxes, updateEncryptionKey } from '../controllers/merchantServicesController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/merchant-services', authorizeRoles(1,2,3,4,5,6),apiRateLimiter(), getMerchantServices);
router.put('/service-encryption/:id', authorizeRoles(1,2,3),apiRateLimiter(), updateEncryptionKey);
router.get('/merchant-services/booking-calendar', authorizeRoles(1,2,3,4,5,6,7),apiRateLimiter(), getMerchantServiceBookingCal);
router.post('/merchant-services', authorizeRoles(1,2,3,4,5,6),apiRateLimiter(), createMerchantService);
router.put('/merchant-services/:id', authorizeRoles(1,2,3,4,5,6),apiRateLimiter(), updateMerchantService);
router.get('/merchant-services', authorizeRoles(1,2,3,4,5,6,7),apiRateLimiter(), getMerchantServicesTaxes);


export default router;