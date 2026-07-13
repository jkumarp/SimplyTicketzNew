import { Router } from 'express';
import { getInvoices, createInvoice } from '../controllers/invoiceController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/invoices', authorizeRoles(1,2,3,4,5),apiRateLimiter(), getInvoices);
router.post('/invoices', authorizeRoles(1,2,3,4,5),apiRateLimiter(), createInvoice);

export default router;