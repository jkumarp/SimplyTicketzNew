import { Router } from 'express';
import { getTickets, createTicket, updateTicket } from '../controllers/ticketController';

const router = Router();

router.get('/tickets', getTickets);
router.post('/tickets', createTicket);
router.put('/tickets/:id', updateTicket);

export default router;