import { Router } from 'express';
import { getInvoiceDetails, createInvoiceDetail, getInvoiceDetailByMerchantId } from '../controllers/invoiceDetailController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/invoice-details', authorizeRoles(1,2,3,4,5), getInvoiceDetails);
router.get('/invoice-details-by-merchantid', authorizeRoles(1,2,3,4,5,6), getInvoiceDetailByMerchantId);

router.post('/invoice-details', authorizeRoles(1,2,3,4,5), createInvoiceDetail);

export default router;