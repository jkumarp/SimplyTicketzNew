import { Router } from 'express';
import { getInvoiceDetails, createInvoiceDetail } from '../controllers/invoiceDetailController';

const router = Router();

router.get('/invoice-details', getInvoiceDetails);
router.post('/invoice-details', createInvoiceDetail);

export default router;