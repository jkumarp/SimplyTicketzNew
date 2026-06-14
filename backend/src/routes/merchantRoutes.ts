import { Router } from 'express';
import { getMerchants, setMerchants, updateMerchant } from '../controllers/merchantController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/merchants', authorizeRoles(1,2,3,4,5,6), getMerchants);
router.post('/merchants', authorizeRoles(1,2,3,4,5), setMerchants);
router.put('/merchants/:id', authorizeRoles(1,2,3,4,5), updateMerchant);

export default router;