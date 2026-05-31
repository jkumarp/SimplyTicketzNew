import { Router } from 'express';
import { getUserTypes } from '../controllers/userTypeController';

const router = Router();

router.get('/user-types', getUserTypes);

export default router;