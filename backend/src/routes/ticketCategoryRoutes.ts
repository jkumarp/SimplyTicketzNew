import { Router } from 'express';
import { createTicketCategory, updateTicketCategory, getTicketCategories } from '../controllers/ticketCategoryController';

const router = Router();

router.get('/ticket-categories', getTicketCategories);
router.post('/ticket-categories', createTicketCategory);
router.put('/ticket-categories/:id', updateTicketCategory);

export default router;