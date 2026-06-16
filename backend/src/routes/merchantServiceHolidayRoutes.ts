import { Router } from 'express';
import { 
  getMerchantServiceHolidays, 
  createMerchantServiceHoliday, 
  updateMerchantServiceHoliday, 
  deleteMerchantServiceHoliday 
} from '../controllers/merchantServiceHolidayController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/merchant-service-holidays', authorizeRoles(1, 2, 3, 4, 5), getMerchantServiceHolidays);
router.post('/merchant-service-holidays', authorizeRoles(1, 2, 3, 4, 5), createMerchantServiceHoliday);
router.put('/merchant-service-holidays/:id', authorizeRoles(1, 2, 3, 4, 5), updateMerchantServiceHoliday);
router.delete('/merchant-service-holidays/:id', authorizeRoles(1, 2, 3, 4, 5), deleteMerchantServiceHoliday);

export default router;