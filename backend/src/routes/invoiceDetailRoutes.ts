import { Router } from 'express';
import { getInvoiceDetails, createInvoiceDetail, getInvoiceDetailByMerchantId } from '../controllers/invoiceDetailController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/invoice-details', authorizeRoles(1,2,3,4,5),apiRateLimiter(), getInvoiceDetails);
router.get('/invoice-details-by-merchantid', authorizeRoles(1,2,3,4,5,6),apiRateLimiter(), getInvoiceDetailByMerchantId);

router.post('/invoice-details', authorizeRoles(1,2,3,4,5),apiRateLimiter(), createInvoiceDetail);

export default router;