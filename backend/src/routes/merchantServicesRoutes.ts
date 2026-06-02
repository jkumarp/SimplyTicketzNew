import { Router } from 'express';
import { createMerchantService, updateMerchantService, getMerchantServices } from '../controllers/merchantServicesController';

const router = Router();

router.get('/merchant-services', getMerchantServices);
router.post('/merchant-services', createMerchantService);
router.put('/merchant-services/:id', updateMerchantService);

export default router;