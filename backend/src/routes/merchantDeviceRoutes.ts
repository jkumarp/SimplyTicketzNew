import { Router } from 'express';
import { getMerchantDevices, createMerchantDevice, updateMerchantDevice } from '../controllers/merchantDevicesController';

const router = Router();

router.get('/merchant-devices', getMerchantDevices);
router.post('/merchant-devices', createMerchantDevice);
router.put('/merchant-devices/:id', updateMerchantDevice);

export default router;