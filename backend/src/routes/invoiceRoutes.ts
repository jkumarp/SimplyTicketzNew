import { Router } from 'express';
import { z } from 'zod';
import { getInvoices, createInvoice } from '../controllers/invoiceController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const getInvoicesSchema = z.object({
  query: z.object({
    merchantId: z.string().optional(),
    // "invoice" has no ticket_id column - tickets reference their invoice via
    // ticket.invoice_id, not the other way around - so filtering is by the
    // invoice's own id, not a ticket id.
    invoiceId: z.string().optional(),
  }),
});

const createInvoiceSchema = z.object({
  body: z.object({
    invoice_number: z.string().min(1).max(100),
    merchant_id: z.number().int().positive(),
    customer_id: z.number().int().positive().optional().nullable(),
    merchant_service_id: z.number().int().positive(),
    total_amount: z.number().min(0),
    scgst_merchant: z.number().min(0).optional(),
    cgst_merchant: z.number().min(0).optional(),
    igst_merchant: z.number().min(0).optional(),
    convinience_fee: z.number().min(0).optional(),
    sgst: z.number().min(0).optional(),
    cgst: z.number().min(0).optional(),
    igst: z.number().min(0).optional(),
    discount_value: z.number().min(0).optional(),
    grand_total: z.number().min(0),
    update_by: z.number().optional(),
    discount_percentage: z.number().min(0).max(100).optional(),
  }),
});

router.get('/invoices', authorizeRoles(1,2,3,4,5,6,7), validate(getInvoicesSchema),apiRateLimiter(), getInvoices);
router.post('/invoices', authorizeRoles(1,2,3,4,5,6,7), validate(createInvoiceSchema),apiRateLimiter(), createInvoice);

export default router;
