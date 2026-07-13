import { Router } from 'express';
import { 
  getMerchantServiceUsers, 
  createMerchantServiceUser, 
  updateMerchantServiceUser, 
  deleteMerchantServiceUser 
} from '../controllers/merchantServiceUserController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/merchant-service-users', authorizeRoles(1, 2, 3, 4, 5),apiRateLimiter(), getMerchantServiceUsers);
router.post('/merchant-service-users', authorizeRoles(1, 2, 3, 4, 5),apiRateLimiter(), createMerchantServiceUser);
router.put('/merchant-service-users/:id', authorizeRoles(1, 2, 3, 4, 5),apiRateLimiter(), updateMerchantServiceUser);
router.delete('/merchant-service-users/:id', authorizeRoles(1, 2, 3, 4, 5),apiRateLimiter(), deleteMerchantServiceUser);

export default router;