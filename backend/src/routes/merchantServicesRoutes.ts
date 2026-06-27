import { Router } from 'express';
import { createMerchantService, updateMerchantService, getMerchantServices, getMerchantServiceBookingCal,getMerchantServicesTaxes } from '../controllers/merchantServicesController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/merchant-services', authorizeRoles(1,2,3,4,5), getMerchantServices);
router.get('/merchant-services/booking-calendar', authorizeRoles(1,2,3,4,5,6,7), getMerchantServiceBookingCal);
router.post('/merchant-services', authorizeRoles(1,2,3,4,5), createMerchantService);
router.put('/merchant-services/:id', authorizeRoles(1,2,3,4,5), updateMerchantService);
router.get('/merchant-services', authorizeRoles(1,2,3,4,5,6,7), getMerchantServicesTaxes);


export default router;