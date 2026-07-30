import { Router } from 'express';
import { z } from 'zod';
import {
  createMerchantPGMapping,
  getMerchantPGMappings,
  updateMerchantPGMapping,
  deleteMerchantPGMapping,
} from '../controllers/merchantPGMappingController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from '../middleware/rateLimitMiddleware';

const router = Router();

// Tolerates numbers sent as strings (form inputs, query params) the same
// way the rest of the codebase's numeric fields do (see e.g.
// merchantServiceVoucherRoutes' `percentage` field).
const optionalMoney = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : (typeof val === 'string' ? parseFloat(val) : val)),
  z.number().min(0).max(9999999999.99).optional(),
);

const optionalSmallInt = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : (typeof val === 'string' ? parseInt(val, 10) : val)),
  z.number().int().min(0).max(32767).optional(),
);

const mappingFields = {
  merchant_id: z.number().int().positive(),
  gateway_id: z.number().int().positive(),
  payment_method: z.string().trim().min(1).max(30).optional().nullable(),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/, 'Currency must be a 3-letter ISO code')
    .transform((v) => v.toUpperCase()).optional(),
  min_amount: optionalMoney,
  max_amount: optionalMoney,
  priority: optionalSmallInt,
  weight: optionalSmallInt,
  is_default: z.boolean().optional(),
  status: z.string().trim().min(1).max(20).optional(),
};

const createMappingSchema = z.object({
  body: z.object(mappingFields).refine(
    (data) => data.min_amount == null || data.max_amount == null || data.min_amount <= data.max_amount,
    { message: 'min_amount cannot be greater than max_amount', path: ['min_amount'] },
  ),
});

const updateMappingSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object(
    Object.fromEntries(
      Object.entries(mappingFields).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()]),
    ),
  ).refine(
    (data: any) => data.min_amount == null || data.max_amount == null || data.min_amount <= data.max_amount,
    { message: 'min_amount cannot be greater than max_amount', path: ['min_amount'] },
  ),
});

const getMappingsSchema = z.object({
  query: z.object({
    merchantId: z.string().optional(),
    gatewayId: z.string().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
    page: z.string().optional(),
    pageSize: z.string().optional(),
  }),
});

const deleteMappingSchema = z.object({
  params: z.object({ id: z.string() }),
});

router.get('/merchant-pg-mappings', authorizeRoles(1, 2, 3, 4, 5,6,7), validate(getMappingsSchema), apiRateLimiter(), getMerchantPGMappings);
router.post('/merchant-pg-mappings', authorizeRoles(1, 2, 3), validate(createMappingSchema), apiRateLimiter(), createMerchantPGMapping);
router.put('/merchant-pg-mappings/:id', authorizeRoles(1, 2, 3), validate(updateMappingSchema), apiRateLimiter(), updateMerchantPGMapping);
router.delete('/merchant-pg-mappings/:id', authorizeRoles(1, 2, 3), validate(deleteMappingSchema), apiRateLimiter(), deleteMerchantPGMapping);

export default router;
