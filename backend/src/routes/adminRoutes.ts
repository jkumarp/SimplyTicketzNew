import { Router } from 'express';
import { generateKey } from '../controllers/adminController';

const router = Router();

router.get('/generateKeyPair', generateKey);

export default router;