import { Router } from 'express';
import { getMerchantEnquiries, createMerchantEnquiry, updateMerchantEnquiry } from '../controllers/merchantEnquiryController';

const router = Router();

router.get('/merchant-enquiries', getMerchantEnquiries);
router.post('/merchant-enquiries', createMerchantEnquiry);
router.put('/merchant-enquiries/:id', updateMerchantEnquiry);

export default router;