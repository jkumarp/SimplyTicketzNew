import { Router } from 'express';
import { generateKey } from '../controllers/adminController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from '../middleware/rateLimitMiddleware';

const router = Router();

// Generates a fresh crypto keypair - super-admin only. This route was
// previously wired up with zero authentication, so anyone who found it
// could mint keypairs on demand; it's currently not mounted in index.ts,
// but is locked down here in case it's wired up later.
router.get('/generateKeyPair', authorizeRoles(1), apiRateLimiter(), generateKey);

export default router;