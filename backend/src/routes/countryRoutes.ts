import { Router } from 'express';
import { getCountries } from '../controllers/countryController';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/countries',apiRateLimiter(), getCountries);

export default router;