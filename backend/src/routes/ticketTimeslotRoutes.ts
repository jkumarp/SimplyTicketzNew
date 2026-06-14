import { Router } from 'express';
import { createTicketTimeslot, updateTicketTimeslot, getTicketTimeslots, getTicketTimeslotsByService,getTicketTimeslotsByCategory } from '../controllers/ticketTimeslotController';
import { authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/ticket-timeslots', authorizeRoles(1,2,3,4,5), getTicketTimeslots);
router.get('/ticket-timeslots-by-service', authorizeRoles(1,2,3,4,5), getTicketTimeslotsByService);
router.get('/ticket-timeslots-by-category', authorizeRoles(1,2,3,4,5), getTicketTimeslotsByCategory);
router.post('/ticket-timeslots', authorizeRoles(1,2,3,4,5), createTicketTimeslot);
router.put('/ticket-timeslots/:id', authorizeRoles(1,2,3,4,5), updateTicketTimeslot);

export default router;