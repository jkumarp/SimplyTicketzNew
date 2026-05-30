import { Router } from 'express';
import { getMerchants, setMerchants } from '../controllers/merchantController';

const router = Router();

router.get('/merchants', getMerchants);
router.post('/merchants', setMerchants);

export default router;