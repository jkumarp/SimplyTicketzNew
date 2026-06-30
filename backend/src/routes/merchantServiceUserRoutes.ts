import { Router } from 'express';
import { 
  getMerchantServiceUsers, 
  createMerchantServiceUser, 
  updateMerchantServiceUser, 
  deleteMerchantServiceUser 
} from '../controllers/merchantServiceUserController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/merchant-service-users', authorizeRoles(1, 2, 3, 4, 5), getMerchantServiceUsers);
router.post('/merchant-service-users', authorizeRoles(1, 2, 3, 4, 5), createMerchantServiceUser);
router.put('/merchant-service-users/:id', authorizeRoles(1, 2, 3, 4, 5), updateMerchantServiceUser);
router.delete('/merchant-service-users/:id', authorizeRoles(1, 2, 3, 4, 5), deleteMerchantServiceUser);

export default router;