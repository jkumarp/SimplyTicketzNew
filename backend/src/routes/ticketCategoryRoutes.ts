import { Router } from 'express';
import { createTicketCategory, updateTicketCategory, getTicketCategories } from '../controllers/ticketCategoryController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/ticket-categories', authorizeRoles(1,2,3,4,5), getTicketCategories);
router.post('/ticket-categories', authorizeRoles(1,2,3,4,5), createTicketCategory);
router.put('/ticket-categories/:id', authorizeRoles(1,2,3,4,5), updateTicketCategory);

export default router;