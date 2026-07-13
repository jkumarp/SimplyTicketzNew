import { Router } from 'express';
import { getStates } from '../controllers/stateController';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/states',apiRateLimiter(), getStates);

export default router;