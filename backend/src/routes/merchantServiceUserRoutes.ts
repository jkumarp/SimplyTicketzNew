import { Router } from 'express';
import { z } from 'zod';
import {
  getMerchantServiceUsers,
  createMerchantServiceUser,
  updateMerchantServiceUser,
  deleteMerchantServiceUser
} from '../controllers/merchantServiceUserController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const createServiceUserSchema = z.object({
  body: z.object({
    merchant_id: z.number().int().positive(),
    service_id: z.number().int().positive(),
    user_id: z.number().int().positive(),
    status_sw: z.boolean().optional(),
    updated_by: z.number().optional(),
  }),
});

const updateServiceUserSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    merchant_id: z.number().int().positive().optional(),
    service_id: z.number().int().positive().optional(),
    user_id: z.number().int().positive().optional(),
    status_sw: z.boolean().optional(),
    updated_by: z.number().optional(),
  }),
});

const getServiceUsersSchema = z.object({
  query: z.object({
    merchantId: z.string().optional(),
    serviceId: z.string().optional(),
    userId: z.string().optional(),
    page: z.string().optional(),
    pageSize: z.string().optional(),
  }),
});

router.get('/merchant-service-users', authorizeRoles(1, 2, 3, 4, 5), validate(getServiceUsersSchema),apiRateLimiter(), getMerchantServiceUsers);
router.post('/merchant-service-users', authorizeRoles(1, 2, 3, 4, 5), validate(createServiceUserSchema),apiRateLimiter(), createMerchantServiceUser);
router.put('/merchant-service-users/:id', authorizeRoles(1, 2, 3, 4, 5), validate(updateServiceUserSchema),apiRateLimiter(), updateMerchantServiceUser);
router.delete('/merchant-service-users/:id', authorizeRoles(1, 2, 3, 4, 5),apiRateLimiter(), deleteMerchantServiceUser);

export default router;
