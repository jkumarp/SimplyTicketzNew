import { Router } from 'express';
import { createTicketCategory, updateTicketCategory, getTicketCategories } from '../controllers/ticketCategoryController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/ticket-categories', authorizeRoles(1,2,3,4,5,6),apiRateLimiter(), getTicketCategories);
router.post('/ticket-categories', authorizeRoles(1,2,3,4,5,6),apiRateLimiter(), createTicketCategory);
router.put('/ticket-categories/:id', authorizeRoles(1,2,3,4,5,6),apiRateLimiter(), updateTicketCategory);

export default router;