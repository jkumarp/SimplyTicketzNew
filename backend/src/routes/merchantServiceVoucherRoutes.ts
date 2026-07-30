import { Router } from 'express';
import { 
  createMerchantServiceVoucher, 
  getMerchantServiceVouchers, 
  updateMerchantServiceVoucher,
  validateMerchantServiceVouchers
} from '../controllers/merchantServiceVoucherController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const createVoucherSchema = z.object({
  body: z.object({
    merchant_id: z.number().int().positive(),
    service_id: z.number().int().positive(),
    voucher_code: z.string().min(1, "Voucher code is required").max(10, "Voucher code cannot exceed 10 characters"),
    percentage: z.preprocess((val) => typeof val === 'string' ? parseFloat(val) : val, z.number().min(0, "Percentage must be positive").max(100, "Percentage cannot exceed 100")),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").nullable().optional().or(z.literal('')),
    status_sw: z.boolean().optional(),
    updated_by: z.number().optional()
  })
});

const updateVoucherSchema = z.object({
  params: z.object({
    id: z.string()
  }),
  body: z.object({
    merchant_id: z.number().int().positive().optional(),
    service_id: z.number().int().positive().optional(),
    voucher_code: z.string().min(1).max(10).optional(),
    percentage: z.preprocess((val) => typeof val === 'string' ? parseFloat(val) : val, z.number().min(0).max(100)).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal('')),
    status_sw: z.boolean().optional(),
    updated_by: z.number().optional()
  })
});

const getVouchersSchema = z.object({
  query: z.object({
    merchantId: z.string().optional(),
    serviceId: z.string().optional(),
    page: z.string().optional(),
    pageSize: z.string().optional(),
  }),
});

const validateVoucherSchema = z.object({
  query: z.object({
    merchantId: z.string().optional(),
    serviceId: z.string().optional(),
    voucherCode: z.string().min(1, 'voucherCode is required'),
  }),
});

router.get('/merchant-service-vouchers', authorizeRoles(1, 2, 3, 4, 5), validate(getVouchersSchema),apiRateLimiter(), getMerchantServiceVouchers);
router.post('/merchant-service-vouchers', authorizeRoles(1, 2, 3, 4, 5), validate(createVoucherSchema),apiRateLimiter(), createMerchantServiceVoucher);
router.put('/merchant-service-vouchers/:id', authorizeRoles(1, 2, 3, 4, 5), validate(updateVoucherSchema),apiRateLimiter(), updateMerchantServiceVoucher);
router.get('/validate-merchant-service-voucher', authorizeRoles(1, 2, 3, 4, 5, 6, 7), validate(validateVoucherSchema),apiRateLimiter(), validateMerchantServiceVouchers);

export default router;