import { Router } from 'express';
import { getStates } from '../controllers/stateController';

const router = Router();

router.get('/states', getStates);

export default router;