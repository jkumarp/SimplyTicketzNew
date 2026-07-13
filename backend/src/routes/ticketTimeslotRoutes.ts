import { Router } from 'express';
import { createTicketTimeslot, updateTicketTimeslot, getTicketTimeslots, getTicketTimeslotsByService,getTicketTimeslotsByCategory } from '../controllers/ticketTimeslotController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { apiRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.get('/ticket-timeslots', authorizeRoles(1,2,3,4,5),apiRateLimiter(), getTicketTimeslots);
router.get('/ticket-timeslots-by-service', authorizeRoles(1,2,3,4,5),apiRateLimiter(), getTicketTimeslotsByService);
router.get('/ticket-timeslots-by-category', authorizeRoles(1,2,3,4,5),apiRateLimiter(), getTicketTimeslotsByCategory);
router.post('/ticket-timeslots', authorizeRoles(1,2,3,4,5),apiRateLimiter(), createTicketTimeslot);
router.put('/ticket-timeslots/:id', authorizeRoles(1,2,3,4,5),apiRateLimiter(), updateTicketTimeslot);

export default router;