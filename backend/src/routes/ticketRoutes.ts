import { Router } from 'express';
import { getTickets, createTicket, updateTicket, bookTicket } from '../controllers/ticketController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/tickets', authorizeRoles(1,2,3,4,5), getTickets);
router.post('/tickets', authorizeRoles(1,2,3,4,5), createTicket);
router.post('/tickets/book', authorizeRoles(1,2,3,4,5), bookTicket);
router.put('/tickets/:id', authorizeRoles(1,2,3,4,5), updateTicket);

export default router;