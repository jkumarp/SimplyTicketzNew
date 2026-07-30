import { Router } from 'express';
import { z } from 'zod';
import { getInvoiceDetails, createInvoiceDetail, getInvoiceDetailByMerchantId } from '../controllers/invoiceDetailController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const getInvoiceDetailsSchema = z.object({
  query: z.object({
    invoiceId: z.string().optional(),
    ticketId: z.string().optional(),
  }),
});

const byMerchantSchema = z.object({
  query: z.object({
    merchantId: z.string().optional(),
    userId: z.string().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
});

const createInvoiceDetailSchema = z.object({
  body: z.object({
    invoice_id: z.number().int().positive(),
    ticket_id: z.number().int().positive(),
    ticket_category_id: z.number().int().positive(),
    adult_price: z.number().min(0),
    child_price: z.number().min(0).optional(),
    adult_count: z.number().int().min(0),
    child_count: z.number().int().min(0),
    total_amount: z.number().min(0),
    update_by: z.number().optional(),
  }),
});

router.get('/invoice-details', authorizeRoles(1,2,3,4,5), validate(getInvoiceDetailsSchema),apiRateLimiter(), getInvoiceDetails);
router.get('/invoice-details-by-merchantid', authorizeRoles(1,2,3,4,5,6), validate(byMerchantSchema),apiRateLimiter(), getInvoiceDetailByMerchantId);

router.post('/invoice-details', authorizeRoles(1,2,3,4,5), validate(createInvoiceDetailSchema),apiRateLimiter(), createInvoiceDetail);

export default router;
