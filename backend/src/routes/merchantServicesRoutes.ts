import { Router } from 'express';
import { createMerchantService, updateMerchantService, getMerchantServices } from '../controllers/merchantServicesController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/merchant-services', authorizeRoles(1,2,3,4,5), getMerchantServices);
router.post('/merchant-services', authorizeRoles(1,2,3,4,5), createMerchantService);
router.put('/merchant-services/:id', authorizeRoles(1,2,3,4,5), updateMerchantService);

export default router;