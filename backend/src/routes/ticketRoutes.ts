import { Router } from 'express';
import { getTickets, createTicket, updateTicket, bookTicket } from '../controllers/ticketController';

const router = Router();

router.get('/tickets', getTickets);
router.post('/tickets', createTicket);
router.post('/tickets/book', bookTicket);
router.put('/tickets/:id', updateTicket);

export default router;