import { Router } from 'express';
import { getUserTypes } from '../controllers/userTypeController';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/user-types',apiRateLimiter(), getUserTypes);

export default router;