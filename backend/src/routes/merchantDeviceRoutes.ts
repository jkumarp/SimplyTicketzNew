import { Router } from 'express';
import { getMerchantDevices, createMerchantDevice, updateMerchantDevice } from '../controllers/merchantDevicesController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/merchant-devices', authorizeRoles(1,2,3,4,5), getMerchantDevices);
router.post('/merchant-devices', authorizeRoles(1,2,3,4,5), createMerchantDevice);
router.put('/merchant-devices/:id', authorizeRoles(1,2,3,4,5), updateMerchantDevice);

export default router;