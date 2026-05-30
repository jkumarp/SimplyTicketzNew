import { Router } from 'express';
import { getMerchants, setMerchants, updateMerchant } from '../controllers/merchantController';

const router = Router();

router.get('/merchants', getMerchants);
router.post('/merchants', setMerchants);
router.put('/merchants/:id', updateMerchant);

export default router;