import { Router } from 'express';
import { createMerchantService, updateMerchantService, getMerchantServices, getMerchantServiceBookingCal } from '../controllers/merchantServicesController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/merchant-services', authorizeRoles(1,2,3,4,5), getMerchantServices);
router.get('/merchant-services/booking-calendar', authorizeRoles(1,2,3,4,5,7), getMerchantServiceBookingCal);
router.post('/merchant-services', authorizeRoles(1,2,3,4,5), createMerchantService);
router.put('/merchant-services/:id', authorizeRoles(1,2,3,4,5), updateMerchantService);

export default router;