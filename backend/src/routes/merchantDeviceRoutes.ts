import { Router } from 'express';
import { z } from 'zod';
import { getMerchantDevices, createMerchantDevice, updateMerchantDevice } from '../controllers/merchantDevicesController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const createDeviceSchema = z.object({
  body: z.object({
    merchant_id: z.number().int().positive(),
    merchant_subscription_id: z.number().int().positive(),
    merchant_service_id: z.number().int().positive(),
    phone: z.string().min(6).max(15),
    publisher_id: z.string().max(255).optional(),
    update_by: z.number().optional(),
    status_sw: z.boolean().optional(),
  }),
});

const updateDeviceSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    merchant_id: z.number().int().positive().optional(),
    merchant_subscription_id: z.number().int().positive().optional(),
    merchant_service_id: z.number().int().positive().optional(),
    phone: z.string().min(6).max(15).optional(),
    publisher_id: z.string().max(255).optional(),
    update_by: z.number().optional(),
    status_sw: z.boolean().optional(),
  }),
});

const getDevicesSchema = z.object({
  query: z.object({
    merchantId: z.string().optional(),
  }),
});

router.get('/merchant-devices', authorizeRoles(1,2,3,4,5), validate(getDevicesSchema),apiRateLimiter(), getMerchantDevices);
router.post('/merchant-devices', authorizeRoles(1,2,3,4,5), validate(createDeviceSchema),apiRateLimiter(), createMerchantDevice);
router.put('/merchant-devices/:id', authorizeRoles(1,2,3,4,5), validate(updateDeviceSchema),apiRateLimiter(), updateMerchantDevice);

export default router;
