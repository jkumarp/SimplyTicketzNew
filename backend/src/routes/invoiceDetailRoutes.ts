import { Router } from 'express';
import { getInvoiceDetails, createInvoiceDetail } from '../controllers/invoiceDetailController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/invoice-details', authorizeRoles(1,2,3,4,5), getInvoiceDetails);
router.post('/invoice-details', authorizeRoles(1,2,3,4,5), createInvoiceDetail);

export default router;