import { Router } from 'express';
import { z } from 'zod';
import { getStates } from '../controllers/stateController';
import { validate } from '../middleware/validate';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

const getStatesSchema = z.object({
  query: z.object({
    countryId: z.string().optional(),
  }),
});

router.get('/states', validate(getStatesSchema), apiRateLimiter(), getStates);

export default router;
