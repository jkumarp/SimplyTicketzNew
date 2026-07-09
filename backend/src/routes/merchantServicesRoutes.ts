import { Router } from 'express';
import { createMerchantService, updateMerchantService, getMerchantServices, getMerchantServiceBookingCal,getMerchantServicesTaxes, updateEncryptionKey } from '../controllers/merchantServicesController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/merchant-services', authorizeRoles(1,2,3,4,5,6), getMerchantServices);
router.put('/service-encryption/:id', authorizeRoles(1,2,3), updateEncryptionKey);
router.get('/merchant-services/booking-calendar', authorizeRoles(1,2,3,4,5,6,7), getMerchantServiceBookingCal);
router.post('/merchant-services', authorizeRoles(1,2,3,4,5,6), createMerchantService);
router.put('/merchant-services/:id', authorizeRoles(1,2,3,4,5,6), updateMerchantService);
router.get('/merchant-services', authorizeRoles(1,2,3,4,5,6,7), getMerchantServicesTaxes);


export default router;