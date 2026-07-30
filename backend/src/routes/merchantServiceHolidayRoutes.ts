import { Router } from 'express';
import { z } from 'zod';
import {
  getMerchantServiceHolidays,
  createMerchantServiceHoliday,
  updateMerchantServiceHoliday,
  deleteMerchantServiceHoliday
} from '../controllers/merchantServiceHolidayController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const createHolidaySchema = z.object({
  body: z.object({
    merchant_id: z.number().int().positive(),
    merchant_service_id: z.number().int().positive(),
    holiday_name: z.string().trim().min(1).max(200),
    holiday_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    update_by: z.number().optional(),
    status_sw: z.boolean().optional(),
  }),
});

const updateHolidaySchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    merchant_id: z.number().int().positive().optional(),
    merchant_service_id: z.number().int().positive().optional(),
    holiday_name: z.string().trim().min(1).max(200).optional(),
    holiday_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    update_by: z.number().optional(),
    status_sw: z.boolean().optional(),
  }),
});

router.get('/merchant-service-holidays', authorizeRoles(1, 2, 3, 4, 5),apiRateLimiter(), getMerchantServiceHolidays);
router.post('/merchant-service-holidays', authorizeRoles(1, 2, 3, 4, 5), validate(createHolidaySchema), apiRateLimiter(),createMerchantServiceHoliday);
router.put('/merchant-service-holidays/:id', authorizeRoles(1, 2, 3, 4, 5), validate(updateHolidaySchema),apiRateLimiter(), updateMerchantServiceHoliday);
router.delete('/merchant-service-holidays/:id', authorizeRoles(1, 2, 3, 4, 5),apiRateLimiter(), deleteMerchantServiceHoliday);

export default router;
