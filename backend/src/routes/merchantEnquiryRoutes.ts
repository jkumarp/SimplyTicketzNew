import { Router } from 'express';
import { getMerchantEnquiries, createMerchantEnquiry, updateMerchantEnquiry } from '../controllers/merchantEnquiryController';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/merchant-enquiries',apiRateLimiter(), getMerchantEnquiries);
router.post('/merchant-enquiries',apiRateLimiter(), createMerchantEnquiry);
router.put('/merchant-enquiries/:id',apiRateLimiter(), updateMerchantEnquiry);

export default router;