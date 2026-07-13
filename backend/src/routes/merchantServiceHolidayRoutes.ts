import { Router } from 'express';
import { 
  getMerchantServiceHolidays, 
  createMerchantServiceHoliday, 
  updateMerchantServiceHoliday, 
  deleteMerchantServiceHoliday 
} from '../controllers/merchantServiceHolidayController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/merchant-service-holidays', authorizeRoles(1, 2, 3, 4, 5),apiRateLimiter(), getMerchantServiceHolidays);
router.post('/merchant-service-holidays', authorizeRoles(1, 2, 3, 4, 5), apiRateLimiter(),createMerchantServiceHoliday);
router.put('/merchant-service-holidays/:id', authorizeRoles(1, 2, 3, 4, 5),apiRateLimiter(), updateMerchantServiceHoliday);
router.delete('/merchant-service-holidays/:id', authorizeRoles(1, 2, 3, 4, 5),apiRateLimiter(), deleteMerchantServiceHoliday);

export default router;