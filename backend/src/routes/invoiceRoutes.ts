import { Router } from 'express';
import { getInvoices, createInvoice } from '../controllers/invoiceController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/invoices', authorizeRoles(1,2,3,4,5), getInvoices);
router.post('/invoices', authorizeRoles(1,2,3,4,5), createInvoice);

export default router;