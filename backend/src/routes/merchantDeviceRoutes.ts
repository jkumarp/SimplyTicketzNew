import { Router } from 'express';
import { getMerchantDevices, createMerchantDevice, updateMerchantDevice } from '../controllers/merchantDevicesController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/merchant-devices', authorizeRoles(1,2,3,4,5),apiRateLimiter(), getMerchantDevices);
router.post('/merchant-devices', authorizeRoles(1,2,3,4,5),apiRateLimiter(), createMerchantDevice);
router.put('/merchant-devices/:id', authorizeRoles(1,2,3,4,5),apiRateLimiter(), updateMerchantDevice);

export default router;