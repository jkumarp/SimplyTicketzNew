import { Router } from 'express';
import { getTickets, createTicket, updateTicket, bookTicket, getTicketsByInvoiceId } from '../controllers/ticketController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/tickets', authorizeRoles(1,2,3,4,5),apiRateLimiter(), getTickets);
router.get('/tickets-by-invoiceId', authorizeRoles(1,2,3,4,5,6,7),apiRateLimiter(), getTicketsByInvoiceId);
router.post('/tickets', authorizeRoles(1,2,3,4,5),apiRateLimiter(), createTicket);
router.post('/tickets/book', authorizeRoles(1,2,3,4,5),apiRateLimiter(), bookTicket);
router.put('/tickets/:id', authorizeRoles(1,2,3,4,5),apiRateLimiter(), updateTicket);

export default router;