import { Router } from 'express';
import { 
  createMerchantServiceVoucher, 
  getMerchantServiceVouchers, 
  updateMerchantServiceVoucher 
} from '../controllers/merchantServiceVoucherController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/merchant-service-vouchers', authorizeRoles(1, 2, 3, 4, 5), getMerchantServiceVouchers);
router.post('/merchant-service-vouchers', authorizeRoles(1, 2, 3, 4, 5), createMerchantServiceVoucher);
router.put('/merchant-service-vouchers/:id', authorizeRoles(1, 2, 3, 4, 5), updateMerchantServiceVoucher);

export default router;