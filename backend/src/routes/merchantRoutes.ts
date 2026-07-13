import { Router } from 'express';
import { getMerchants, setMerchants, updateMerchant } from '../controllers/merchantController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/merchants', authorizeRoles(1,2,3,4,5,6),apiRateLimiter(), getMerchants);
router.post('/merchants', authorizeRoles(1,2,3,4,5),apiRateLimiter(), setMerchants);
router.put('/merchants/:id', authorizeRoles(1,2,3,4,5),apiRateLimiter(), updateMerchant);

export default router;